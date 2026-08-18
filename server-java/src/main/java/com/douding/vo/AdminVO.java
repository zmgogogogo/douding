package com.douding.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** 管理员响应 VO — 对应 Express 返回的管理员信息格式 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdminVO {

    /** 登录时返回的 token（仅 login 接口返回） */
    private String token;

    /** 管理员基本信息 */
    private Long id;
    private String username;
    private String nickname;
    private String avatar;
    private Long roleId;
    private List<String> permissions;

    /** me 接口返回 */
    private LocalDateTime createdAt;
}
