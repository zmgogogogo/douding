package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/** 珠子颜色实体 */
@Data
@TableName("bead_colors")
public class BeadColor {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long seriesId;
    private String name;
    private String hex;
    private Integer sortOrder;

    private Double labL;
    private Double labA;
    private Double labB;
    private Integer colorType;
    private Integer isHot;
    private Integer isDiscontinued;
}
