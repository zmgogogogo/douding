package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** 用户珠子库存 */
@Data
@TableName("user_bead_inventory")
public class UserBeadInventory {

    @TableId(type = IdType.ASSIGN_ID)
    private Long userId;

    private Long colorId;
    private Integer quantity;
    private Integer minThreshold;
    private Integer transitQuantity;
    private Double unitCost;
    private String location;

    private LocalDateTime updatedAt;
}
