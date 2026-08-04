package com.douding.security;

import com.douding.common.AppException;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * 认证切面 — 拦截 @AuthRequired 注解，检查是否已登录
 */
@Slf4j
@Aspect
@Component
public class AuthAspect {

    @Around("@annotation(com.douding.security.AuthRequired)")
    public Object checkAuth(ProceedingJoinPoint joinPoint) throws Throwable {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtTokenProvider.TokenClaims)) {
            throw AppException.unauthorized("请先登录");
        }
        return joinPoint.proceed();
    }
}
