package com.douding.dto;

import lombok.Data;

/** 注册请求 DTO — 手机号+验证码+密码注册 */
@Data
public class RegisterDTO {

    /** 手机号（必填） */
    private String phone;

    /** 短信验证码（必填） */
    private String code;

    /** 密码（必填，≥6位） */
    private String password;

    /** 确认密码（必填，需与密码一致） */
    private String confirmPassword;

    /** 昵称（可选） */
    private String nickname;
}
