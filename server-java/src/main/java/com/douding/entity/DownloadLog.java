package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** 下载日志实体 */
@Data
@TableName("download_logs")
public class DownloadLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Long designId;
    private String format;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
