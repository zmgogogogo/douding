package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** 操作日志实体 */
@Data
@TableName("sys_operation_logs")
public class SysOperationLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long adminId;
    private String adminName;
    private String module;
    private String action;
    private String targetType;
    private Long targetId;
    private String detail;
    private String ip;
    private String userAgent;
    private Integer status;
    private String errorMsg;
    private Integer durationMs;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
