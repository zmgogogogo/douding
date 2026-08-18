package com.douding.security;

import com.douding.entity.SysOperationLog;
import com.douding.mapper.SysOperationLogMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 操作日志记录切面 — 拦截 @AdminOperationLog 注解
 * 替代 Express services/admin/logService.js 的 logAction() 和 withOperationLog()
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AdminOperationLogAspect {

    private final SysOperationLogMapper logMapper;
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Around("@annotation(com.douding.security.AdminOperationLog)")
    public Object recordLog(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();

        // 获取注解信息
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        AdminOperationLog annotation = signature.getMethod().getAnnotation(AdminOperationLog.class);

        // 获取当前管理员信息
        var auth = SecurityContextHolder.getContext().getAuthentication();
        Long adminId = null;
        String adminName = "system";

        if (auth instanceof AdminAuthenticationToken adminAuth) {
            adminId = adminAuth.getAdminId();
            adminName = adminAuth.getAdminName();
        }

        // 构建日志对象
        SysOperationLog operLog = new SysOperationLog();
        operLog.setAdminId(adminId);
        operLog.setAdminName(adminName);
        operLog.setModule(annotation.module());
        operLog.setAction(annotation.action());
        operLog.setTargetType(annotation.targetType());
        operLog.setTargetId(extractTargetId(joinPoint));

        // 提取请求详情
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                operLog.setIp(getClientIp(req));
                operLog.setUserAgent(req.getHeader("User-Agent"));
            }
        } catch (Exception e) {
            // 在非 Web 环境中忽略
        }

        // 记录请求体（非 GET 时）
        String httpMethod = "GET";
        try {
            var attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) httpMethod = attrs.getRequest().getMethod();
        } catch (Exception ignored) {}

        if (!"GET".equalsIgnoreCase(httpMethod)) {
            try {
                // 提取方法参数作为详情
                StringBuilder detail = new StringBuilder();
                String[] paramNames = signature.getParameterNames();
                Object[] args = joinPoint.getArgs();
                if (paramNames != null && args != null) {
                    for (int i = 0; i < args.length; i++) {
                        if (args[i] == null) continue;
                        if (paramNames[i].startsWith("arg") && i < paramNames.length) {
                            // 跳过绑定参数（如 HttpServletRequest）
                            if (args[i] instanceof jakarta.servlet.http.HttpServletRequest) continue;
                            if (args[i] instanceof jakarta.servlet.http.HttpServletResponse) continue;
                        }
                        detail.append(paramNames[i]).append("=").append(objectMapper.writeValueAsString(args[i])).append("; ");
                    }
                }
                operLog.setDetail(detail.toString());
            } catch (Exception e) {
                operLog.setDetail("请求数据提取失败");
            }
        }

        // 执行目标方法
        try {
            Object result = joinPoint.proceed();
            // 成功
            operLog.setStatus(1);
            operLog.setDurationMs((int) (System.currentTimeMillis() - startTime));
            logMapper.insert(operLog);
            return result;
        } catch (Throwable e) {
            // 失败
            operLog.setStatus(0);
            operLog.setErrorMsg(e.getMessage());
            operLog.setDurationMs((int) (System.currentTimeMillis() - startTime));
            try { logMapper.insert(operLog); } catch (Exception ex) { /* 日志记录失败也不影响业务 */ }
            throw e;
        }
    }

    /** 从方法参数中提取 targetId（查找名为 id 的参数） */
    private Long extractTargetId(ProceedingJoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String[] paramNames = signature.getParameterNames();
        Object[] args = joinPoint.getArgs();
        if (paramNames != null && args != null) {
            for (int i = 0; i < paramNames.length; i++) {
                if ("id".equals(paramNames[i]) && args[i] instanceof Long) {
                    return (Long) args[i];
                }
            }
        }
        return null;
    }

    /** 获取客户端真实 IP */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
            return ip.split(",")[0].trim();
        }
        ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
            return ip;
        }
        return request.getRemoteAddr();
    }
}
