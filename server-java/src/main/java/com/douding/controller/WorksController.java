package com.douding.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.entity.*;
import com.douding.mapper.*;
import com.douding.security.AuthRequired;
import com.douding.security.CurrentUser;
import com.douding.security.JwtTokenProvider;
import com.douding.vo.DesignVO;
import com.douding.vo.UserVO;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/** 作品专区控制器 — 替代 routes/works.js */
@RestController
@RequestMapping("/api/work")
@RequiredArgsConstructor
public class WorksController {

    private final DesignMapper designMapper;
    private final UserMapper userMapper;
    private final JdbcTemplate jdbc;

    @GetMapping("/list")
    public Result<Map<String, Object>> list(
            @RequestParam(defaultValue = "hot") String tab,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "15") int pageSize,
            @CurrentUser JwtTokenProvider.TokenClaims claims) {

        int limit = Math.min(100, Math.max(1, pageSize));

        // 需要用 MyBatis 查（返回 camelCase + gridData），不能直接用 jdbcTemplate
        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Design> qw =
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<>();
        com.baomidou.mybatisplus.extension.plugins.pagination.Page<Design> mpPage =
                new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(page, limit);

        if ("mine".equals(tab)) {
            if (claims == null) {
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("list", List.of()); r.put("total", 0); r.put("hasMore", false); r.put("needLogin", true);
                return Result.success(r);
            }
            qw.eq(Design::getUserId, claims.id()).orderByDesc(Design::getUpdatedAt);
        } else if ("likes".equals(tab)) {
            if (claims == null) {
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("list", List.of()); r.put("total", 0); r.put("hasMore", false); r.put("needLogin", true);
                return Result.success(r);
            }
            // likes 查询保持用 jdbc（需要 JOIN）
            String sql = "SELECT d.* FROM designs d JOIN design_likes l ON d.id = l.design_id WHERE l.user_id = ? ORDER BY l.created_at DESC LIMIT ? OFFSET ?";
            List<Map<String, Object>> rows = jdbc.queryForList(sql, claims.id(), limit, (page - 1) * limit);
            Long total = jdbc.queryForObject("SELECT COUNT(*) FROM design_likes WHERE user_id = ?", Long.class, claims.id());
            return buildLikesResponse(rows, total, claims);
        } else if ("recommend".equals(tab)) {
            qw.eq(Design::getIsPublic, 1).orderByDesc(Design::getPublishedAt).orderByDesc(Design::getUpdatedAt);
        } else {
            qw.eq(Design::getIsPublic, 1).orderByDesc(Design::getLikesCount).orderByDesc(Design::getUpdatedAt);
        }

        designMapper.selectPage(mpPage, qw);
        List<Design> designs = mpPage.getRecords();
        long total = mpPage.getTotal();

        List<Map<String, Object>> list = designs.stream().map(d -> {
            Map<String, Object> item = designToMap(d);
            User u = userMapper.selectById(d.getUserId());
            item.put("author", u != null ? Map.of("id", u.getId(),
                    "nickname", u.getNickname() != null ? u.getNickname() : u.getUsername(),
                    "avatar", u.getAvatar() != null ? u.getAvatar() : "")
                    : Map.of("nickname", "匿名"));
            item.put("isLiked", false);
            return item;
        }).collect(Collectors.toList());

        // 批量标记点赞
        if (claims != null && !list.isEmpty()) {
            List<Long> ids = list.stream().map(m -> ((Number) m.get("id")).longValue()).toList();
            String inClause = ids.stream().map(i -> "?").collect(Collectors.joining(","));
            List<Object> lp = new ArrayList<>(); lp.add(claims.id()); lp.addAll(ids);
            List<Map<String, Object>> likes = jdbc.queryForList(
                    "SELECT design_id FROM design_likes WHERE user_id = ? AND design_id IN (" + inClause + ")", lp.toArray());
            Set<Long> likedSet = likes.stream().map(r -> ((Number) r.get("design_id")).longValue()).collect(Collectors.toSet());
            list.forEach(m -> m.put("isLiked", likedSet.contains(((Number) m.get("id")).longValue())));
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("list", list);
        data.put("total", total);
        data.put("hasMore", (page - 1) * limit + list.size() < total);

        return Result.success(data);
    }

    /** likes tab: jdbcTemplate 返回的行转成前端格式 */
    private Result<Map<String, Object>> buildLikesResponse(List<Map<String, Object>> rows, Long total,
                                                             JwtTokenProvider.TokenClaims claims) {
        List<Map<String, Object>> list = rows.stream().map(r -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", r.get("id")); item.put("title", r.get("title"));
            item.put("gridWidth", r.get("grid_width")); item.put("gridHeight", r.get("grid_height"));
            item.put("gridData", parseGridData((String) r.get("grid_data")));
            item.put("beadCount", r.get("bead_count")); item.put("colorCount", r.get("color_count"));
            item.put("likesCount", r.get("likes_count")); item.put("viewsCount", r.get("views_count"));
            item.put("thumbnail", r.get("thumbnail")); item.put("brand", r.get("brand"));
            item.put("isLiked", true);
            return item;
        }).collect(Collectors.toList());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("list", list);
        data.put("total", total);
        data.put("hasMore", false);
        return Result.success(data);
    }

    /** Design entity → 前端 Map（camelCase + gridData 解析为数组） */
    private Map<String, Object> designToMap(Design d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId()); m.put("title", d.getTitle());
        m.put("description", d.getDescription()); m.put("brand", d.getBrand());
        m.put("gridWidth", d.getGridWidth()); m.put("gridHeight", d.getGridHeight());
        m.put("gridData", parseGridData(d.getGridData()));
        m.put("thumbnail", d.getThumbnail());
        m.put("beadCount", d.getBeadCount()); m.put("colorCount", d.getColorCount());
        m.put("likesCount", d.getLikesCount()); m.put("viewsCount", d.getViewsCount());
        m.put("isPublic", d.getIsPublic()); m.put("status", d.getStatus());
        m.put("favoritesCount", d.getFavoritesCount());
        m.put("commentCount", d.getFavoritesCount() != null ? d.getFavoritesCount() : 0); // 用 favorites_count 占位
        m.put("createdAt", d.getCreatedAt() != null ? d.getCreatedAt().toString() : null);
        m.put("updatedAt", d.getUpdatedAt() != null ? d.getUpdatedAt().toString() : null);
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

    @GetMapping("/detail/{workId}")
    public Result<Map<String, Object>> detail(@PathVariable Long workId,
                                               @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Design d = designMapper.selectOne(
                new LambdaQueryWrapper<Design>().eq(Design::getId, workId).eq(Design::getStatus, 1));
        if (d == null) throw AppException.notFound("作品不存在或已下架");

        // 浏览+1
        d.setViewsCount(d.getViewsCount() + 1);
        designMapper.updateById(d);

        User author = userMapper.selectById(d.getUserId());

        // 关注/点赞状态
        boolean isFollow = false, isLiked = false;
        if (claims != null) {
            Long c = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM user_follow WHERE follower_id = ? AND following_id = ?",
                    Long.class, claims.id(), d.getUserId());
            isFollow = c != null && c > 0;
            c = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM design_likes WHERE user_id = ? AND design_id = ?",
                    Long.class, claims.id(), workId);
            isLiked = c != null && c > 0;
        }

        // 评论数
        Long commentCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM design_comments WHERE design_id = ? AND deleted = 0",
                Long.class, workId);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", d.getId());
        data.put("title", d.getTitle());
        data.put("description", d.getDescription());
        data.put("gridWidth", d.getGridWidth());
        data.put("gridHeight", d.getGridHeight());
        data.put("gridData", d.getGridData());
        data.put("thumbnail", d.getThumbnail());
        data.put("beadCount", d.getBeadCount());
        data.put("colorCount", d.getColorCount());
        data.put("likesCount", d.getLikesCount());
        data.put("viewsCount", d.getViewsCount());
        data.put("brand", d.getBrand());
        data.put("createdAt", d.getCreatedAt());
        data.put("updatedAt", d.getUpdatedAt());
        data.put("publishedAt", d.getPublishedAt());

        data.put("author", author != null ? Map.of(
                "id", author.getId(),
                "nickname", author.getNickname() != null ? author.getNickname() : author.getUsername(),
                "avatar", author.getAvatar() != null ? author.getAvatar() : "",
                "bio", author.getBio() != null ? author.getBio() : ""
        ) : null);

        data.put("isLiked", isLiked);
        data.put("isFollow", isFollow);
        data.put("commentCount", commentCount != null ? commentCount : 0);

        // 用料清单从 grid_data 解析
        List<Map<String, Object>> beanList = parseBeanList(d.getGridData());
        data.put("beanInfo", Map.of("totalColorType", beanList.size(),
                "totalBeanNum", beanList.stream().mapToInt(b -> ((Number) b.get("needNum")).intValue()).sum(),
                "colorList", beanList));

        Map<Integer, String> difficultyMap = Map.of(1, "简单", 2, "中等", 3, "困难");
        data.put("baseParam", Map.of(
                "gridSize", d.getGridWidth() + "×" + d.getGridHeight(),
                "difficulty", d.getDifficulty() != null ? d.getDifficulty() : 1,
                "difficultyText", difficultyMap.getOrDefault(d.getDifficulty() != null ? d.getDifficulty() : 1, "简单"),
                "costTime", d.getCostTime() != null ? d.getCostTime() : "",
                "realSize", d.getRealSize() != null ? d.getRealSize() : ""
        ));

        return Result.success(data);
    }

    @PostMapping("/like")
    @AuthRequired
    public Result<Map<String, Object>> like(@RequestBody Map<String, Long> body,
                                              @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Long workId = body.get("workId");
        if (workId == null) throw AppException.badRequest("缺少作品 ID");

        Design d = designMapper.selectOne(
                new LambdaQueryWrapper<Design>().eq(Design::getId, workId).eq(Design::getStatus, 1));
        if (d == null) throw AppException.notFound("作品不存在");

        Long exists = jdbc.queryForObject(
                "SELECT COUNT(*) FROM design_likes WHERE user_id = ? AND design_id = ?",
                Long.class, claims.id(), workId);

        if (exists != null && exists > 0) {
            jdbc.update("DELETE FROM design_likes WHERE user_id = ? AND design_id = ?", claims.id(), workId);
            jdbc.update("UPDATE designs SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?", workId);
            Long newCount = jdbc.queryForObject("SELECT likes_count FROM designs WHERE id = ?", Long.class, workId);
            return Result.success(Map.of("liked", false, "likesCount", newCount != null ? newCount.intValue() : 0));
        }

        jdbc.update("INSERT INTO design_likes (user_id, design_id) VALUES (?, ?)", claims.id(), workId);
        jdbc.update("UPDATE designs SET likes_count = likes_count + 1 WHERE id = ?", workId);
        Long newCount = jdbc.queryForObject("SELECT likes_count FROM designs WHERE id = ?", Long.class, workId);
        return Result.success(Map.of("liked", true, "likesCount", newCount != null ? newCount.intValue() : 0));
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseBeanList(String gridData) {
        if (gridData == null) return List.of();
        try {
            List<List<Map<String, Object>>> grid = new com.fasterxml.jackson.databind.ObjectMapper().readValue(gridData, List.class);
            Map<String, Map<String, Object>> colorMap = new LinkedHashMap<>();
            for (List<Map<String, Object>> row : grid) {
                if (row == null) continue;
                for (Map<String, Object> cell : row) {
                    if (cell != null && cell.get("hex") != null) {
                        String key = cell.get("hex").toString();
                        colorMap.computeIfAbsent(key, k -> {
                            Map<String, Object> m = new LinkedHashMap<>();
                            m.put("colorCode", cell.getOrDefault("name", "?"));
                            m.put("colorHex", key);
                            m.put("needNum", 0);
                            m.put("seriesName", "");
                            return m;
                        });
                        colorMap.get(key).put("needNum", ((Number) colorMap.get(key).get("needNum")).intValue() + 1);
                    }
                }
            }
            return new ArrayList<>(colorMap.values());
        } catch (Exception e) { return List.of(); }
    }
}
