package com.douding.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.douding.common.Result;
import com.douding.entity.Design;
import com.douding.entity.User;
import com.douding.mapper.DesignMapper;
import com.douding.mapper.UserMapper;
import com.douding.vo.UserVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/** 发现广场 + 搜索 — 替代 routes/explore.js */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ExploreController {

    private final DesignMapper designMapper;
    private final UserMapper userMapper;

    @GetMapping("/explore")
    public Result<Result.PageData<Map<String, Object>>> explore(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "24") int limit,
            @RequestParam(defaultValue = "latest") String sort) {

        Page<Design> result = new Page<>(page, limit);
        LambdaQueryWrapper<Design> qw = new LambdaQueryWrapper<Design>()
                .eq(Design::getIsPublic, 1)
                .ne(Design::getStatus, -2); // 排除已删除的作品

        switch (sort) {
            case "popular" -> qw.orderByDesc(Design::getLikesCount);
            case "views" -> qw.orderByDesc(Design::getViewsCount);
            default -> qw.orderByDesc(Design::getUpdatedAt);
        }

        designMapper.selectPage(result, qw);
        List<Map<String, Object>> list = enrichWithAuthor(result.getRecords());
        return Result.paginated(list, result.getTotal(), page, limit);
    }

    @GetMapping("/search")
    public Result<Result.PageData<Map<String, Object>>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "24") int limit) {

        if (q == null || q.isBlank()) return Result.paginated(List.of(), 0, page, limit);

        String like = "%" + q + "%";
        LambdaQueryWrapper<Design> qw = new LambdaQueryWrapper<Design>()
                .eq(Design::getIsPublic, 1)
                .ne(Design::getStatus, -2) // 排除已删除的作品
                .and(w -> w.like(Design::getTitle, like).or().like(Design::getDescription, like))
                .orderByDesc(Design::getUpdatedAt);

        Page<Design> result = designMapper.selectPage(new Page<>(page, limit), qw);
        List<Map<String, Object>> list = enrichWithAuthor(result.getRecords());
        return Result.paginated(list, result.getTotal(), page, limit);
    }

    private List<Map<String, Object>> enrichWithAuthor(List<Design> designs) {
        if (designs.isEmpty()) return List.of();
        Set<Long> userIds = designs.stream().map(Design::getUserId).collect(Collectors.toSet());
        Map<Long, User> userMap = userMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        return designs.stream().map(d -> {
            Map<String, Object> m = designToMap(d);
            User u = userMap.get(d.getUserId());
            m.put("author", Map.of("id", u != null ? u.getId() : 0,
                    "username", u != null ? u.getUsername() : "",
                    "nickname", u != null && u.getNickname() != null ? u.getNickname() : (u != null ? u.getUsername() : "匿名"),
                    "avatar", u != null && u.getAvatar() != null ? u.getAvatar() : ""));
            return m;
        }).collect(Collectors.toList());
    }

    private Map<String, Object> designToMap(Design d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId()); m.put("userId", d.getUserId());
        m.put("title", d.getTitle()); m.put("description", d.getDescription());
        m.put("gridWidth", d.getGridWidth()); m.put("gridHeight", d.getGridHeight());
        m.put("gridData", parseGridData(d.getGridData())); m.put("thumbnail", d.getThumbnail());
        m.put("isPublic", d.getIsPublic()); m.put("beadCount", d.getBeadCount());
        m.put("colorCount", d.getColorCount()); m.put("likesCount", d.getLikesCount());
        m.put("viewsCount", d.getViewsCount()); m.put("brand", d.getBrand());
        m.put("status", d.getStatus()); m.put("favoritesCount", d.getFavoritesCount());
        m.put("difficulty", d.getDifficulty());
        m.put("createdAt", d.getCreatedAt() != null ? d.getCreatedAt().toString() : null);
        m.put("updatedAt", d.getUpdatedAt() != null ? d.getUpdatedAt().toString() : null);
        m.put("publishedAt", d.getPublishedAt() != null ? d.getPublishedAt().toString() : null);
        return m;
    }

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
