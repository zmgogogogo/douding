package com.douding.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.douding.common.Result;
import com.douding.entity.BeadBrand;
import com.douding.entity.BeadColor;
import com.douding.entity.BeadSeries;
import com.douding.mapper.BeadBrandMapper;
import com.douding.mapper.BeadColorMapper;
import com.douding.mapper.BeadSeriesMapper;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 珠子数据控制器 — 替代 routes/beads.js
 * 品牌/系列/颜色层级结构查询
 */
@Tag(name = "珠子数据")
@RestController
@RequestMapping("/api/beads")
@RequiredArgsConstructor
public class BeadsController {

    private final BeadBrandMapper brandMapper;
    private final BeadSeriesMapper seriesMapper;
    private final BeadColorMapper colorMapper;

    /** 层级结构（品牌→系列→颜色），Redis 缓存 1 小时 */
    @GetMapping
    @Cacheable(value = "beads:hierarchy", unless = "#result == null")
    public Result<List<BrandVO>> getBeads() {
        List<BeadBrand> brands = brandMapper.selectList(null);
        List<BeadSeries> allSeries = seriesMapper.selectList(null);
        List<BeadColor> allColors = colorMapper.selectList(
                new LambdaQueryWrapper<BeadColor>().orderByAsc(BeadColor::getSortOrder));

        // 按 series_id 分组颜色
        Map<Long, List<BeadColor>> colorsBySeries = allColors.stream()
                .collect(Collectors.groupingBy(BeadColor::getSeriesId));

        // 按 brand_id 分组系列
        Map<Long, List<BeadSeries>> seriesByBrand = allSeries.stream()
                .collect(Collectors.groupingBy(BeadSeries::getBrandId));

        return Result.success(brands.stream().map(brand -> {
            List<BeadSeries> brandSeries = seriesByBrand.getOrDefault(brand.getId(), Collections.emptyList());
            brandSeries.sort(Comparator.comparing(BeadSeries::getSortOrder));
            return new BrandVO(
                    brand.getName(),
                    brand.getSlug(),
                    brandSeries.stream().map(s -> new SeriesVO(
                            s.getId(),
                            s.getName(),
                            colorsBySeries.getOrDefault(s.getId(), Collections.emptyList()).stream()
                                    .map(c -> new ColorVO(c.getId(), c.getName(), c.getHex()))
                                    .collect(Collectors.toList())
                    )).collect(Collectors.toList())
            );
        }).collect(Collectors.toList()));
    }

    /** 扁平颜色列表（编辑器调色板用），Redis 缓存 1 小时 */
    @GetMapping("/colors")
    @Cacheable(value = "beads:colors", unless = "#result == null")
    public Result<List<ColorItemVO>> getColors() {
        List<BeadColor> colors = colorMapper.selectList(
                new LambdaQueryWrapper<BeadColor>().orderByAsc(BeadColor::getSortOrder));
        List<BeadSeries> allSeries = seriesMapper.selectList(null);
        List<BeadBrand> allBrands = brandMapper.selectList(null);

        Map<Long, String> seriesMap = allSeries.stream()
                .collect(Collectors.toMap(BeadSeries::getId, BeadSeries::getName));
        Map<Long, String> brandMap = allBrands.stream()
                .collect(Collectors.toMap(BeadBrand::getId, BeadBrand::getName));

        return Result.success(colors.stream().map(c -> {
            String series = seriesMap.getOrDefault(c.getSeriesId(), "");
            // 通过series找brand
            BeadSeries s = allSeries.stream().filter(x -> x.getId().equals(c.getSeriesId())).findFirst().orElse(null);
            String brand = s != null ? brandMap.getOrDefault(s.getBrandId(), "") : "";
            return new ColorItemVO(c.getId(), c.getName(), c.getHex(), series, brand);
        }).collect(Collectors.toList()));
    }

    // ========== VO 定义 ==========

    public record BrandVO(String name, String slug, List<SeriesVO> series) {}
    public record SeriesVO(Long id, String name, List<ColorVO> colors) {}
    public record ColorVO(Long id, String name, String hex) {}
    public record ColorItemVO(Long id, String name, String hex, String series, String brand) {}
}
