package com.douding.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.entity.Design;
import com.douding.entity.User;
import com.douding.mapper.DesignMapper;
import com.douding.mapper.UserMapper;
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

/** 用户控制器 — 替代 routes/user.js + routes/follow.js */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserController {

    private final UserMapper userMapper;
    private final DesignMapper designMapper;
    private final JdbcTemplate jdbc;

    // ===== 关注 =====

    @PostMapping("/user/follow")
    @AuthRequired
    public Result<Map<String, Object>> follow(@RequestBody Map<String, Long> body,
                                                @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Long targetUid = body.get("targetUid");
        if (targetUid == null) throw AppException.badRequest("缺少目标用户 ID");
        if (targetUid.equals(claims.id())) throw AppException.badRequest("不能关注自己");

        User target = userMapper.selectById(targetUid);
        if (target == null) throw AppException.notFound("用户不存在");

        Long exists = jdbc.queryForObject(
                "SELECT COUNT(*) FROM user_follow WHERE follower_id = ? AND following_id = ?",
                Long.class, claims.id(), targetUid);

        if (exists != null && exists > 0) {
            jdbc.update("DELETE FROM user_follow WHERE follower_id = ? AND following_id = ?", claims.id(), targetUid);
            return Result.success(Map.of("isFollow", false));
        }

        jdbc.update("INSERT INTO user_follow (follower_id, following_id) VALUES (?, ?)", claims.id(), targetUid);
        return Result.success(Map.of("isFollow", true));
    }

    @GetMapping("/user/{id}/followers")
    public Result<Map<String, Object>> followers(@PathVariable Long id,
                                                   @RequestParam(defaultValue = "1") int page,
                                                   @RequestParam(defaultValue = "20") int limit,
                                                   @CurrentUser JwtTokenProvider.TokenClaims claims) {
        int offset = (Math.max(1, page) - 1) * limit;
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT u.id, u.username, u.nickname, u.avatar, u.bio, f.created_at as follow_time " +
                "FROM user_follow f JOIN users u ON f.follower_id = u.id " +
                "WHERE f.following_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?", id, limit, offset);
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM user_follow WHERE following_id = ?", Long.class, id);
        return Result.success(buildFollowResult(rows, total, page, limit, claims));
    }

    @GetMapping("/user/{id}/following")
    public Result<Map<String, Object>> following(@PathVariable Long id,
                                                   @RequestParam(defaultValue = "1") int page,
                                                   @RequestParam(defaultValue = "20") int limit,
                                                   @CurrentUser JwtTokenProvider.TokenClaims claims) {
        int offset = (Math.max(1, page) - 1) * limit;
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT u.id, u.username, u.nickname, u.avatar, u.bio, f.created_at as follow_time " +
                "FROM user_follow f JOIN users u ON f.following_id = u.id " +
                "WHERE f.follower_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?", id, limit, offset);
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM user_follow WHERE follower_id = ?", Long.class, id);
        return Result.success(buildFollowResult(rows, total, page, limit, claims));
    }

    private Map<String, Object> buildFollowResult(List<Map<String, Object>> rows, Long total,
                                                    int page, int limit, JwtTokenProvider.TokenClaims claims) {
        List<Map<String, Object>> list = rows.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>(r);
            m.put("followTime", r.get("follow_time"));
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("list", list);
        data.put("total", total);
        data.put("page", page);
        data.put("limit", limit);
        data.put("hasMore", (page - 1) * limit + rows.size() < total);
        return data;
    }

    // ===== 用户主页 =====

    @GetMapping("/user/profile/{id}")
    public Result<Map<String, Object>> profile(@PathVariable Long id,
                                                @CurrentUser JwtTokenProvider.TokenClaims claims) {
        if (id == null || id < 1) throw AppException.badRequest("用户 ID 无效");
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getId, id).eq(User::getStatus, 1));
        if (user == null) throw AppException.notFound("用户不存在或已注销");

        Long worksCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM designs WHERE user_id = ? AND is_public = 1 AND status = 1", Long.class, id);
        Long followersCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM user_follow WHERE following_id = ?", Long.class, id);
        Long followingCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM user_follow WHERE follower_id = ?", Long.class, id);
        Long totalLikes = jdbc.queryForObject(
                "SELECT COALESCE(SUM(likes_count),0) FROM designs WHERE user_id = ? AND is_public = 1 AND status = 1", Long.class, id);

        boolean isFollow = false, isSelf = false;
        if (claims != null) {
            isSelf = claims.id().equals(id);
            if (!isSelf) {
                Long c = jdbc.queryForObject(
                        "SELECT COUNT(*) FROM user_follow WHERE follower_id = ? AND following_id = ?", Long.class, claims.id(), id);
                isFollow = c != null && c > 0;
            }
        }

        List<Design> works = designMapper.selectList(
                new LambdaQueryWrapper<Design>()
                        .eq(Design::getUserId, id).eq(Design::getIsPublic, 1).eq(Design::getStatus, 1)
                        .orderByDesc(Design::getPublishedAt).orderByDesc(Design::getUpdatedAt)
                        .last("LIMIT 12"));

        Long totalWorks = jdbc.queryForObject(
                "SELECT COUNT(*) FROM designs WHERE user_id = ? AND is_public = 1 AND status = 1", Long.class, id);

        Set<Long> likedSet = new HashSet<>();
        if (claims != null && !isSelf && !works.isEmpty()) {
            List<Long> ids = works.stream().map(Design::getId).toList();
            String in = ids.stream().map(i -> "?").collect(Collectors.joining(","));
            Object[] params = new Object[ids.size() + 1];
            params[0] = claims.id();
            for (int i = 0; i < ids.size(); i++) params[i + 1] = ids.get(i);
            List<Map<String, Object>> likes = jdbc.queryForList(
                    "SELECT design_id FROM design_likes WHERE user_id = ? AND design_id IN (" + in + ")", params);
            likedSet.addAll(likes.stream().map(r -> ((Number) r.get("design_id")).longValue()).collect(Collectors.toSet()));
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("user", UserVO.from(user));
        data.put("stats", Map.of("works", worksCount, "followers", followersCount, "following", followingCount, "totalLikes", totalLikes));
        data.put("isFollow", isFollow);
        data.put("isSelf", isSelf);

        Map<String, Object> worksData = new LinkedHashMap<>();
        worksData.put("list", works.stream().map(d -> {
            Map<String, Object> m = designToMap(d);
            m.put("author", Map.of("id", user.getId(), "username", user.getUsername(),
                    "nickname", user.getNickname() != null ? user.getNickname() : user.getUsername(),
                    "avatar", user.getAvatar() != null ? user.getAvatar() : ""));
            m.put("isLiked", likedSet.contains(d.getId()));
            return m;
        }).collect(Collectors.toList()));
        worksData.put("total", totalWorks);
        worksData.put("hasMore", works.size() < (totalWorks != null ? totalWorks : 0));
        data.put("works", worksData);

        return Result.success(data);
    }

    @GetMapping("/user/{id}/works")
    public Result<Map<String, Object>> userWorks(@PathVariable Long id,
                                                   @RequestParam(defaultValue = "1") int page,
                                                   @RequestParam(defaultValue = "12") int limit,
                                                   @RequestParam(defaultValue = "latest") String sort) {
        int offset = (Math.max(1, page) - 1) * limit;
        String orderBy = "popular".equals(sort) ? "d.likes_count DESC" : "d.published_at DESC, d.updated_at DESC";

        List<Map<String, Object>> works = jdbc.queryForList(
                "SELECT d.*, u.username, u.nickname, u.avatar FROM designs d JOIN users u ON d.user_id = u.id " +
                "WHERE d.user_id = ? AND d.is_public = 1 AND d.status = 1 ORDER BY " + orderBy + " LIMIT ? OFFSET ?",
                id, limit, offset);
        Long total = jdbc.queryForObject(
                "SELECT COUNT(*) FROM designs WHERE user_id = ? AND is_public = 1 AND status = 1", Long.class, id);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("list", works);
        data.put("total", total);
        data.put("hasMore", offset + works.size() < (total != null ? total : 0));
        return Result.success(data);
    }

    @GetMapping("/user/{id}")
    public Result<UserVO> userBrief(@PathVariable Long id) {
        if (id == null || id < 1) throw AppException.badRequest("用户 ID 无效");
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getId, id).eq(User::getStatus, 1));
        if (user == null) throw AppException.notFound("用户不存在或已注销");
        return Result.success(UserVO.from(user));
    }

    @GetMapping("/user/likes")
    @AuthRequired
    public Result<Result.PageData<Map<String, Object>>> myLikes(
            @CurrentUser JwtTokenProvider.TokenClaims claims,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        int offset = (Math.max(1, page) - 1) * limit;

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT d.*, u.username, u.nickname, u.avatar FROM design_likes l " +
                "JOIN designs d ON l.design_id = d.id JOIN users u ON d.user_id = u.id " +
                "WHERE l.user_id = ? ORDER BY l.created_at DESC LIMIT ? OFFSET ?", claims.id(), limit, offset);
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM design_likes WHERE user_id = ?", Long.class, claims.id());

        return Result.paginated(rows, total != null ? total : 0, page, limit);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> designToMap(Design d) {
        try { return new com.fasterxml.jackson.databind.ObjectMapper().convertValue(DesignVO.from(d), Map.class); }
        catch (Exception e) { return new LinkedHashMap<>(); }
    }
}
