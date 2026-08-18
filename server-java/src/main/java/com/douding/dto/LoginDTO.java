package com.douding.dto;

import lombok.Data;

/** 登录请求 DTO — 支持用户名密码和手机号验证码两种方式 */
@Data
public class LoginDTO {

    /** 用户名（用户名登录时填） */
    private String username;

    /** 密码（用户名登录时填） */
    private String password;

    /** 手机号（手机号登录时填） */
    private String phone;

    /** 短信验证码（手机号登录时填） */
    private String code;
}
