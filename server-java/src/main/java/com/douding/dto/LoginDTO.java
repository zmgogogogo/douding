package com.douding.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 登录请求 DTO */
@Data
public class LoginDTO {

    @NotBlank(message = "请输入用户名")
    private String username;

    @NotBlank(message = "请输入密码")
    private String password;
}
