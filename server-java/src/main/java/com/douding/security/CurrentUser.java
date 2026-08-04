package com.douding.security;

import java.lang.annotation.*;

/**
 * 当前用户参数注解 — 用于注入当前登录用户信息到 Controller 方法参数
 *
 * 使用方式：
 *   public Result<?> myDesigns(@CurrentUser JwtTokenProvider.TokenClaims user) { ... }
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface CurrentUser {
}
