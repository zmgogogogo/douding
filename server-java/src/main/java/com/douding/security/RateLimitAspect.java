package com.douding.security;

import com.douding.common.AppException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.concurrent.TimeUnit;

/**
 * 速率限制切面 — 基于 Redis 计数器
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class RateLimitAspect {

    private final RedisTemplate<String, Object> redisTemplate;

    @Around("@annotation(rateLimit)")
    public Object checkRateLimit(ProceedingJoinPoint joinPoint, RateLimit rateLimit) throws Throwable {
        HttpServletRequest request =
                ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();

        // 构建 Redis Key
        String ip = getClientIp(request);
        String key = String.format("ratelimit:%s:%s:%s",
                rateLimit.key(),
                ip,
                request.getRequestURI());

        // 递增计数
        Long count = redisTemplate.opsForValue().increment(key);
        if (count == null) count = 1L;

        // 首次访问设置过期时间
        if (count == 1) {
            redisTemplate.expire(key, rateLimit.windowMs(), TimeUnit.MILLISECONDS);
        }

        if (count > rateLimit.maxRequests()) {
            log.warn("速率限制触发: IP={}, URI={}, count={}", ip, request.getRequestURI(), count);
            throw new AppException(429, "请求过于频繁，请稍后再试");
        }

        return joinPoint.proceed();
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // 多级代理取第一个
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip != null ? ip : "unknown";
    }
}
