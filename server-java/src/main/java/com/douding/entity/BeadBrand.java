package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/** 珠子品牌实体 */
@Data
@TableName("bead_brands")
public class BeadBrand {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;
    private String slug;
}
