package com.douding.dto;

import lombok.Data;

/** 创建/更新设计请求 DTO */
@Data
public class CreateDesignDTO {

    private String title;
    private String description;
    private Integer gridWidth;
    private Integer gridHeight;
    private Object gridData;  // JSON 数组或字符串
    private String thumbnail;
    private Boolean isPublic;
    private String brand;
    private Long folderId;
}
