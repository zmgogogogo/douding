package com.douding.vo;

import com.douding.entity.Design;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 设计/作品视图对象 — 对应 formatDesign()
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DesignVO {

    private Long id;
    private Long userId;
    private Long folderId;
    private String title;
    private String description;
    private Integer gridWidth;
    private Integer gridHeight;
    private String gridData;
    private String thumbnail;
    private Integer isPublic;
    private Integer beadCount;
    private Integer colorCount;
    private Integer likesCount;
    private Integer viewsCount;
    private String brand;

    /** 作品详情扩展字段 */
    private Integer status;
    private Integer isRecommended;
    private Integer weight;
    private String copyrightDesc;
    private Integer isRemix;
    private Integer difficulty;
    private String costTime;
    private String realSize;
    private Integer favoritesCount;

    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static DesignVO from(Design d) {
        return DesignVO.builder()
                .id(d.getId())
                .userId(d.getUserId())
                .folderId(d.getFolderId())
                .title(d.getTitle())
                .description(d.getDescription())
                .gridWidth(d.getGridWidth())
                .gridHeight(d.getGridHeight())
                .gridData(d.getGridData())
                .thumbnail(d.getThumbnail())
                .isPublic(d.getIsPublic())
                .beadCount(d.getBeadCount())
                .colorCount(d.getColorCount())
                .likesCount(d.getLikesCount())
                .viewsCount(d.getViewsCount())
                .brand(d.getBrand())
                .status(d.getStatus())
                .isRecommended(d.getIsRecommended())
                .weight(d.getWeight())
                .copyrightDesc(d.getCopyrightDesc())
                .isRemix(d.getIsRemix())
                .difficulty(d.getDifficulty())
                .costTime(d.getCostTime())
                .realSize(d.getRealSize())
                .favoritesCount(d.getFavoritesCount())
                .publishedAt(d.getPublishedAt())
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }
}
