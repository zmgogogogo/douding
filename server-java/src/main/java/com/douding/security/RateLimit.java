package com.douding.security;

import java.lang.annotation.*;

/**
 * 速率限制注解 — 替代 Express rate-limit 中间件
 * 基于 Redis 实现
 *
 * 使用方式：
 *   @RateLimit(windowMs = 900000, maxRequests = 500)  // 15分钟500次
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RateLimit {

    /** 时间窗口（毫秒），默认 15 分钟 */
    long windowMs() default 15 * 60 * 1000;

    /** 窗口内最大请求数 */
    int maxRequests() default 500;

    /** 成功后是否跳过计数（用于登录限流） */
    boolean skipSuccessful() default false;

    /** 限流 Key 前缀 */
    String key() default "rl";
}
