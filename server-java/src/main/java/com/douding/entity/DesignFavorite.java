package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** 设计收藏实体 */
@Data
@TableName("design_favorites")
public class DesignFavorite {

    private Long userId;
    private Long designId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
