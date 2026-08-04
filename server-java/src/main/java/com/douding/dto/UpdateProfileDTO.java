package com.douding.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

/** 更新个人资料 DTO */
@Data
public class UpdateProfileDTO {

    private String nickname;

    @Size(max = 200, message = "简介不能超过200字")
    private String bio;
}
