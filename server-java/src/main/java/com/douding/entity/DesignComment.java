package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** 设计评论实体 */
@Data
@TableName("design_comments")
public class DesignComment {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long designId;
    private Long userId;
    private Integer parentId;
    private Integer replyToUid;
    private String content;
    private Integer likeNum;
    private Integer deleted;

    private LocalDateTime createdAt;
}
