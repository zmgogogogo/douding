package com.douding.controller.admin;

import com.douding.common.AppException;
import com.douding.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Stream;

/** 管理后台：用户管理 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUsersController {

    private final JdbcTemplate jdbc;

    @GetMapping
    public Result<Map<String, Object>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String keyword) {

        int offset = (Math.max(1, page) - 1) * limit;
        String where = "";
        List<Object> params = new ArrayList<>();

        if (keyword != null && !keyword.isBlank()) {
            where = " WHERE username LIKE ? OR nickname LIKE ?";
            params.add("%" + keyword + "%");
            params.add("%" + keyword + "%");
        }

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, username, nickname, avatar, status, created_at FROM users" + where +
                " ORDER BY created_at DESC LIMIT ? OFFSET ?",
                Stream.concat(params.stream(), Stream.of(limit, offset)).toArray());

        Object[] countParams = params.toArray();
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM users" + where, Long.class, countParams);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("list", rows);
        data.put("total", total);
        data.put("page", page);
        return Result.success(data);
    }

    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable Long id) {
        Map<String, Object> user = queryForMapOrNull("SELECT * FROM users WHERE id = ?", id);
        if (user == null) throw AppException.notFound("用户不存在");

        Long designsCount = jdbc.queryForObject("SELECT COUNT(*) FROM designs WHERE user_id = ?", Long.class, id);
        Map<String, Object> data = new LinkedHashMap<>(user);
        data.put("designsCount", designsCount);
        return Result.success(data);
    }

    @PutMapping("/{id}/status")
    public Result<Void> toggleStatus(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        jdbc.update("UPDATE users SET status = ? WHERE id = ?", body.get("status"), id);
        return Result.success();
    }

    private Map<String, Object> queryForMapOrNull(String sql, Object... params) {
        try { return jdbc.queryForMap(sql, params); } catch (Exception e) { return null; }
    }
}
