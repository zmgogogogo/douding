package com.douding.security;

import java.lang.annotation.*;

/**
 * 管理后台操作日志注解 — 替代 Express 的 withOperationLog 中间件
 * 标注在 Controller 方法上，自动记录操作日志到 sys_operation_logs 表
 *
 * 使用方式：
 *   @AdminOperationLog(module = "用户管理", action = "封禁", targetType = "user")
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface AdminOperationLog {

    /** 操作模块，如 "用户管理"、"内容管理" */
    String module();

    /** 操作动作，如 "update"、"delete"、"封禁"、"解封" */
    String action();

    /** 目标类型，如 "user"、"design"、"banner" */
    String targetType() default "";
}
