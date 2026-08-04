package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** 制作会话实体 */
@Data
@TableName("make_sessions")
public class MakeSession {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Long designId;
    private String archiveName;
    private Integer currentStep;
    private String finishedSteps;
    private String stepMode;
    private Integer totalDuration;
    private String status;
    private Integer archiveOrder;
    private String snapshotHistory;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
