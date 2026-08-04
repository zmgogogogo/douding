package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/** 珠子系列实体 */
@Data
@TableName("bead_series")
public class BeadSeries {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long brandId;
    private String name;
    private Integer sortOrder;
}
