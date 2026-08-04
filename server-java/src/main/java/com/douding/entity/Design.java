package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** 设计/作品实体 */
@Data
@TableName("designs")
public class Design {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Long folderId;
    private String title;
    private String description;
    private Integer gridWidth;
    private Integer gridHeight;
    @TableField("grid_data")
    private String gridData;
    private String thumbnail;
    private Integer isPublic;
    private Integer beadCount;
    private Integer colorCount;
    private Integer likesCount;
    private Integer viewsCount;
    private String brand;

    private Integer status;
    private Integer isRecommended;
    private Integer weight;
    private String reviewComment;
    private LocalDateTime publishedAt;

    private String copyrightDesc;
    private Integer isRemix;
    private Integer difficulty;
    private String costTime;
    private String realSize;

    private Integer favoritesCount;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
