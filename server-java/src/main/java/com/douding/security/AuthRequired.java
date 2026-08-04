package com.douding.security;

import java.lang.annotation.*;

/**
 * 强制认证注解 — 等同于 Express middleware/auth.js 的 authRequired
 * 标注在 Controller 方法上，未登录返回 401
 *
 * 使用方式：
 *   @AuthRequired  → 必须登录
 *   不加注解        → 可选登录（authOptional）
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface AuthRequired {
}
