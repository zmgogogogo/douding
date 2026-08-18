package com.douding.security;

import com.douding.common.AppException;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * 管理员权限校验切面 — 拦截 @AdminPermission 注解
 * 替代 Express middleware/adminAuth.js 的 adminPermission(...perms)
 */
@Slf4j
@Aspect
@Component
public class AdminPermissionAspect {

    @Around("@annotation(com.douding.security.AdminPermission)")
    public Object checkPermission(ProceedingJoinPoint joinPoint) throws Throwable {
        // 获取当前认证信息
        var auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !(auth instanceof AdminAuthenticationToken adminAuth)) {
            throw AppException.unauthorized("请先登录管理后台");
        }

        // 超级管理员直接放行
        if (adminAuth.isSuperAdmin()) {
            return joinPoint.proceed();
        }

        // 获取注解中的权限点
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        AdminPermission annotation = signature.getMethod().getAnnotation(AdminPermission.class);
        String[] requiredPerms = annotation.value();

        // 检查权限（OR 逻辑）
        if (!adminAuth.hasAnyPermission(requiredPerms)) {
            log.warn("权限不足: admin={}, perms={}, required={}",
                    adminAuth.getAdminName(), adminAuth.getPermissions(), requiredPerms);
            throw AppException.forbidden("权限不足，无法执行此操作");
        }

        return joinPoint.proceed();
    }
}
