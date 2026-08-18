package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** 评论点赞实体 */
@Data
@TableName("comment_likes")
public class CommentLike {

    private Long userId;
    private Long commentId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
