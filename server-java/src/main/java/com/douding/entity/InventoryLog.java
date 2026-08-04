package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** 库存操作日志 */
@Data
@TableName("inventory_logs")
public class InventoryLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Long colorId;
    private String action;
    private Integer quantity;
    private Integer balanceAfter;
    private String sourceType;
    private Long sourceId;
    private String sourceName;
    private String note;

    private LocalDateTime createdAt;
}
