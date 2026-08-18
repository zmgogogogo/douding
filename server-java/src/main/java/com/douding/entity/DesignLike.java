package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** 设计点赞实体 */
@Data
@TableName("design_likes")
public class DesignLike {

    private Long userId;
    private Long designId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
