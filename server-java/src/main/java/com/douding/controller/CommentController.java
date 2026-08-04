package com.douding.controller;

import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.security.AuthRequired;
import com.douding.security.CurrentUser;
import com.douding.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Stream;

/** 评论控制器 — 替代 routes/comments.js */
@RestController
@RequestMapping("/api/work/comment")
@RequiredArgsConstructor
public class CommentController {

    private final JdbcTemplate jdbc;

    @GetMapping("/list")
    public Result<Map<String, Object>> list(
            @RequestParam Long workId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @CurrentUser JwtTokenProvider.TokenClaims claims) {

        int limit = Math.min(50, pageSize);
        int offset = (Math.max(1, page) - 1) * limit;

        List<Map<String, Object>> comments = jdbc.queryForList(
                "SELECT c.*, u.username, u.nickname, u.avatar FROM design_comments c " +
                "LEFT JOIN users u ON c.user_id = u.id " +
                "WHERE c.design_id = ? AND c.parent_id = 0 AND c.deleted = 0 " +
                "ORDER BY c.created_at DESC LIMIT ? OFFSET ?",
                workId, limit, offset);

        Long total = jdbc.queryForObject(
                "SELECT COUNT(*) FROM design_comments WHERE design_id = ? AND parent_id = 0 AND deleted = 0",
                Long.class, workId);

        Set<Long> likedIds = new HashSet<>();
        if (claims != null) {
            List<Long> ids = comments.stream().map(c -> ((Number) c.get("id")).longValue()).toList();
            if (!ids.isEmpty()) {
                String in = String.join(",", Collections.nCopies(ids.size(), "?"));
                List<Object> likeParams = new ArrayList<>();
                likeParams.add(claims.id());
                likeParams.addAll(ids);
                likedIds = new HashSet<>(jdbc.queryForList(
                        "SELECT comment_id FROM comment_likes WHERE user_id = ? AND comment_id IN (" + in + ")",
                        Long.class, likeParams.toArray()));
            }
        }

        List<Map<String, Object>> list = new ArrayList<>();
        for (var c : comments) {
            Map<String, Object> item = formatComment(c);
            Long cid = ((Number) c.get("id")).longValue();

            // 取楼中楼回复
            List<Map<String, Object>> replies = jdbc.queryForList(
                    "SELECT r.*, u.username, u.nickname, u.avatar, ru.nickname as reply_to_nickname " +
                    "FROM design_comments r LEFT JOIN users u ON r.user_id = u.id " +
                    "LEFT JOIN users ru ON r.reply_to_uid = ru.id " +
                    "WHERE r.parent_id = ? AND r.deleted = 0 ORDER BY r.created_at ASC", cid);
            item.put("replies", replies.stream().map(this::formatComment).toList());
            item.put("isLiked", likedIds.contains(cid));
            list.add(item);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("list", list);
        data.put("total", total);
        data.put("hasMore", offset + comments.size() < total);
        return Result.success(data);
    }

    @PostMapping("/add")
    @AuthRequired
    public Result<Map<String, Object>> add(@RequestBody Map<String, Object> body,
                                             @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Long workId = toLong(body.get("workId"));
        String content = (String) body.get("content");
        if (workId == null) throw AppException.badRequest("缺少作品 ID");
        if (content == null || content.trim().isEmpty()) throw AppException.badRequest("评论内容不能为空");
        if (content.length() > 500) throw AppException.badRequest("评论不能超过500字");

        Long exists = jdbc.queryForObject("SELECT COUNT(*) FROM designs WHERE id = ? AND status = 1", Long.class, workId);
        if (exists == null || exists == 0) throw AppException.notFound("作品不存在");

        jdbc.update("INSERT INTO design_comments (design_id, user_id, parent_id, content) VALUES (?, ?, 0, ?)",
                workId, claims.id(), content.trim());

        Long newId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        Map<String, Object> comment = jdbc.queryForMap(
                "SELECT c.*, u.username, u.nickname, u.avatar FROM design_comments c " +
                "LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ?", newId);
        return Result.success(formatComment(comment));
    }

    @PostMapping("/reply")
    @AuthRequired
    public Result<Map<String, Object>> reply(@RequestBody Map<String, Object> body,
                                               @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Long commentId = toLong(body.get("commentId"));
        Long workId = toLong(body.get("workId"));
        String content = (String) body.get("content");
        Long replyToUid = toLong(body.get("replyToUid"));

        if (commentId == null || workId == null) throw AppException.badRequest("缺少必要参数");
        if (content == null || content.trim().isEmpty()) throw AppException.badRequest("回复内容不能为空");
        if (content.length() > 500) throw AppException.badRequest("回复不能超过500字");

        jdbc.update("INSERT INTO design_comments (design_id, user_id, parent_id, reply_to_uid, content) VALUES (?,?,?,?,?)",
                workId, claims.id(), commentId, replyToUid != null ? replyToUid : 0, content.trim());

        Long newId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        Map<String, Object> reply = jdbc.queryForMap(
                "SELECT r.*, u.username, u.nickname, u.avatar, ru.nickname as reply_to_nickname " +
                "FROM design_comments r LEFT JOIN users u ON r.user_id = u.id " +
                "LEFT JOIN users ru ON r.reply_to_uid = ru.id WHERE r.id = ?", newId);
        return Result.success(formatComment(reply));
    }

    @PostMapping("/like")
    @AuthRequired
    public Result<Map<String, Object>> likeComment(@RequestBody Map<String, Long> body,
                                                     @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Long commentId = body.get("commentId");
        if (commentId == null) throw AppException.badRequest("缺少评论 ID");

        Long exists = jdbc.queryForObject(
                "SELECT COUNT(*) FROM comment_likes WHERE user_id = ? AND comment_id = ?",
                Long.class, claims.id(), commentId);

        if (exists != null && exists > 0) {
            jdbc.update("DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?", claims.id(), commentId);
            jdbc.update("UPDATE design_comments SET like_num = GREATEST(0, like_num - 1) WHERE id = ?", commentId);
        } else {
            jdbc.update("INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)", claims.id(), commentId);
            jdbc.update("UPDATE design_comments SET like_num = like_num + 1 WHERE id = ?", commentId);
        }
        Long newNum = jdbc.queryForObject("SELECT like_num FROM design_comments WHERE id = ?", Long.class, commentId);
        return Result.success(Map.of("liked", exists == null || exists == 0, "likeNum", newNum != null ? newNum.intValue() : 0));
    }

    private Map<String, Object> formatComment(Map<String, Object> c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.get("id"));
        m.put("content", c.get("content"));
        m.put("likeNum", c.getOrDefault("like_num", 0));
        m.put("parentId", c.getOrDefault("parent_id", 0));
        m.put("replyToUid", c.getOrDefault("reply_to_uid", 0));
        m.put("replyToNickname", c.getOrDefault("reply_to_nickname", ""));
        m.put("createdAt", c.get("created_at"));
        m.put("isAuthor", false);
        m.put("user", Map.of(
                "id", c.get("user_id"),
                "nickname", c.getOrDefault("nickname", c.getOrDefault("username", "匿名")),
                "avatar", c.getOrDefault("avatar", "")
        ));
        return m;
    }

    private Long toLong(Object v) {
        if (v instanceof Number n) return n.longValue();
        if (v instanceof String s) { try { return Long.parseLong(s); } catch (Exception e) { return null; } }
        return null;
    }

}
