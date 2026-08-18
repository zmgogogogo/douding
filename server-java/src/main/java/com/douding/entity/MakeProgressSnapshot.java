package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** 制作进度快照实体 */
@Data
@TableName("make_progress_snapshots")
public class MakeProgressSnapshot {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long sessionId;
    private String snapshotData;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
