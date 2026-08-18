package com.douding.security;

import java.lang.annotation.*;

/**
 * 管理后台权限校验注解 — 替代 Express middleware/adminAuth.js 的 adminPermission()
 * 标注在 Controller 方法上，检查当前管理员是否拥有指定权限（OR 逻辑）
 *
 * 使用方式：
 *   @AdminPermission("admin:users:write")  → 需要该权限
 *   @AdminPermission({"admin:users:write", "admin:users:ban"}) → 满足任一即可
 *   不加注解 → 仅需 adminRequired 认证
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface AdminPermission {

    /** 需要的权限点列表，满足任一即可通过（OR 逻辑） */
    String[] value();
}
