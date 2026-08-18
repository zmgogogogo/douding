package com.douding.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/** 用户信息视图对象 — 对应 userPublic() */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserVO {

    private Long id;
    private String username;
    private String nickname;
    private String avatar;
    private String bio;
    private String phone;
    private Boolean phoneVerified;
    private Integer isVip;
    private LocalDateTime vipExpireAt;
    private Integer status;
    private String banReason;
    private LocalDateTime bannedAt;
    private Long designCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** 将 Entity 转为对外展示的 VO */
    public static UserVO from(com.douding.entity.User user) {
        return UserVO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname() != null ? user.getNickname() : user.getUsername())
                .avatar(user.getAvatar())
                .bio(user.getBio())
                .phone(user.getPhone())
                .phoneVerified(user.getPhoneVerifiedAt() != null)
                .isVip(user.getIsVip())
                .vipExpireAt(user.getVipExpireAt())
                .status(user.getStatus())
                .banReason(user.getBanReason())
                .bannedAt(user.getBannedAt())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
