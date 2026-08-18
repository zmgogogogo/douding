package com.douding.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** 文件夹实体 */
@Data
@TableName("folders")
public class Folder {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String name;
    private Integer sortOrder;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
