package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** 制作记录实体 */
@Data
@TableName("make_records")
public class MakeRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Long designId;
    private Long sessionId;
    private String drawingTitle;
    private Integer totalBeans;
    private Integer colorCount;
    private Integer duration;
    private String stepMode;
    private Double lossRate;
    private Integer deductStock;
    private LocalDateTime finishTime;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
