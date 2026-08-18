package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** 豆仓信息实体 */
@Data
@TableName("warehouse_info")
public class WarehouseInfo {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String name;
    private Double defaultSpec;
    private String defaultBrand;
    private Integer isDefault;
    private Integer status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
