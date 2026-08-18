package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** Banner 实体 */
@Data
@TableName("banners")
public class Banner {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String title;
    private String subtitle;
    private String imageUrl;
    private String bgColor;
    private String linkType;
    private String linkValue;
    private Integer sortOrder;
    private Integer status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
