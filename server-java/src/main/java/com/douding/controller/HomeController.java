package com.douding.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.douding.common.Result;
import com.douding.entity.Design;
import com.douding.entity.User;
import com.douding.mapper.DesignMapper;
import com.douding.mapper.UserMapper;
import com.douding.security.CurrentUser;
import com.douding.security.JwtTokenProvider;
import com.douding.vo.UserVO;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 首页控制器 — 替代 routes/home.js
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HomeController {

    private final DesignMapper designMapper;
    private final UserMapper userMapper;

    /** 首页初始化数据，Redis 缓存 3 分钟 */
    @GetMapping("/home/init")
    @Cacheable(value = "home:init", unless = "#result == null || #result.data == null")
    public Result<Map<String, Object>> init(@CurrentUser JwtTokenProvider.TokenClaims claims) {
        // Banner
        List<Map<String, String>> banners = Arrays.asList(
                Map.of("bgColor", "#22c55e", "title", "欢迎来到豆丁", "subtitle", "开始你的拼豆创作之旅", "link", "/editor"),
                Map.of("bgColor", "#8b5cf6", "title", "Q版生成上线", "subtitle", "一键生成Q版拼豆图纸", "link", "/editor?mode=qstyle")
        );

        // 核心功能
        List<Map<String, String>> mainTools = Arrays.asList(
                Map.of("name", "图片转拼豆", "icon", "ImageIcon", "bgColor", "#dcfce7", "iconColor", "#16a34a", "route", "/image-import"),
                Map.of("name", "空白创作", "icon", "PenIcon", "bgColor", "#dbeafe", "iconColor", "#2563eb", "route", "/editor"),
                Map.of("name", "Q版生成", "icon", "SparklesIcon", "bgColor", "#fef3c7", "iconColor", "#d97706", "route", "/editor?mode=qstyle"),
                Map.of("name", "辅助拼豆", "icon", "Grid3X3Icon", "bgColor", "#fce7f3", "iconColor", "#db2777", "route", "/editor?mode=assist")
        );

        // 快捷工具
        List<Map<String, String>> quickTools = Arrays.asList(
                Map.of("name", "文字转拼豆", "icon", "TypeIcon", "route", "/editor?mode=text"),
                Map.of("name", "色板工具", "icon", "PaletteIcon", "route", "/palette"),
                Map.of("name", "豆仓管理", "icon", "PackageIcon", "route", "/warehouse"),
                Map.of("name", "找色助手", "icon", "ScanIcon", "route", "/color-finder"),
                Map.of("name", "尺寸计算", "icon", "CalculatorIcon", "route", "/calculator"),
                Map.of("name", "制作教程", "icon", "BookOpenIcon", "route", "/tutorials"),
                Map.of("name", "图纸打印", "icon", "PrinterIcon", "route", "/print"),
                Map.of("name", "更多工具", "icon", "MoreHorizontalIcon", "route", "/tools")
        );

        // 分类标签
        List<Map<String, String>> categoryTabs = Arrays.asList(
                Map.of("key", "recommend", "label", "推荐"),
                Map.of("key", "popular", "label", "热门"),
                Map.of("key", "template", "label", "模板"),
                Map.of("key", "works", "label", "作品"),
                Map.of("key", "tutorial", "label", "教程"),
                Map.of("key", "activity", "label", "活动")
        );

        // 首屏内容
        List<Design> designs = designMapper.selectList(
                new LambdaQueryWrapper<Design>()
                        .eq(Design::getIsPublic, 1)
                        .orderByDesc(Design::getLikesCount)
                        .last("LIMIT 20"));

        Long total = designMapper.selectCount(
                new LambdaQueryWrapper<Design>().eq(Design::getIsPublic, 1));

        // 批量获取作者信息
        Set<Long> userIds = designs.stream().map(Design::getUserId).collect(Collectors.toSet());
        Map<Long, User> userMap = new HashMap<>();
        if (!userIds.isEmpty()) {
            userMap = userMapper.selectBatchIds(userIds).stream()
                    .collect(Collectors.toMap(User::getId, u -> u));
        }

        Map<Long, User> finalUserMap = userMap;
        List<Map<String, Object>> contentList = designs.stream().map(d -> {
            Map<String, Object> item = designToMap(d);
            User author = finalUserMap.get(d.getUserId());
            item.put("type", "works");
            item.put("author", author != null ? Map.of(
                    "id", author.getId(),
                    "username", author.getUsername(),
                    "nickname", author.getNickname() != null ? author.getNickname() : author.getUsername(),
                    "avatar", author.getAvatar() != null ? author.getAvatar() : ""
            ) : null);
            return item;
        }).collect(Collectors.toList());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("banners", banners);
        data.put("mainTools", mainTools);
        data.put("quickTools", quickTools);
        data.put("categoryTabs", categoryTabs);
        data.put("contentList", contentList);
        data.put("total", total);

        return Result.success(data);
    }

    /** 内容流分页 */
    @GetMapping("/home/content/list")
    public Result<Map<String, Object>> contentList(
            @RequestParam(defaultValue = "recommend") String category,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @CurrentUser JwtTokenProvider.TokenClaims claims) {

        int offset = (Math.max(1, page) - 1) * limit;
        String orderBy = switch (category) {
            case "popular" -> "likes_count DESC";
            case "template", "activity" -> "updated_at DESC";
            case "tutorial" -> "views_count DESC";
            default -> "likes_count DESC, updated_at DESC";
        };

        // 使用自定义查询
        List<Design> designs = designMapper.selectList(
                new LambdaQueryWrapper<Design>()
                        .eq(Design::getIsPublic, 1)
                        .orderByDesc(Design::getLikesCount)
                        .last("LIMIT " + limit + " OFFSET " + offset));

        Long total = designMapper.selectCount(
                new LambdaQueryWrapper<Design>().eq(Design::getIsPublic, 1));

        List<Map<String, Object>> list = designs.stream().map(d -> {
            Map<String, Object> item = new LinkedHashMap<>(designToMap(d));
            item.put("type", "works");
            return item;
        }).collect(Collectors.toList());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("list", list);
        data.put("total", total);
        data.put("hasMore", offset + designs.size() < total);

        return Result.success(data);
    }

    private Map<String, Object> designToMap(Design d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("userId", d.getUserId());
        m.put("title", d.getTitle());
        m.put("description", d.getDescription());
        m.put("gridWidth", d.getGridWidth());
        m.put("gridHeight", d.getGridHeight());
        m.put("gridData", parseGridData(d.getGridData()));
        m.put("thumbnail", d.getThumbnail());
        m.put("isPublic", d.getIsPublic());
        m.put("beadCount", d.getBeadCount());
        m.put("colorCount", d.getColorCount());
        m.put("likesCount", d.getLikesCount());
        m.put("viewsCount", d.getViewsCount());
        m.put("brand", d.getBrand());
        m.put("status", d.getStatus());
        m.put("favoritesCount", d.getFavoritesCount());
        m.put("difficulty", d.getDifficulty());
        m.put("costTime", d.getCostTime());
        m.put("realSize", d.getRealSize());
        m.put("createdAt", d.getCreatedAt() != null ? d.getCreatedAt().toString() : null);
        m.put("updatedAt", d.getUpdatedAt() != null ? d.getUpdatedAt().toString() : null);
        m.put("publishedAt", d.getPublishedAt() != null ? d.getPublishedAt().toString() : null);
        return m;
    }

    /** 解析 gridData JSON 字符串为数组（前端需要数组格式） */
    @SuppressWarnings("unchecked")
    private Object parseGridData(String gridData) {
        if (gridData == null || gridData.isBlank()) return null;
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(gridData, List.class);
        } catch (Exception e) {
            return null;
        }
    }
}
