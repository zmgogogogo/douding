package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** 用户库存设置实体 */
@Data
@TableName("user_stock_settings")
public class UserStockSettings {

    @TableId(type = IdType.INPUT)
    private Long userId;

    private Integer autoDeduct;
    private Double defaultLossRate;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
