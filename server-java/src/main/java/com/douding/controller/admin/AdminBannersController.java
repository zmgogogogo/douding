package com.douding.controller.admin;

import com.douding.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/** 管理后台：Banner 管理 */
@RestController
@RequestMapping("/api/admin/banners")
@RequiredArgsConstructor
public class AdminBannersController {

    private final JdbcTemplate jdbc;

    @GetMapping
    public Result<List<Map<String, Object>>> list() {
        return Result.success(jdbc.queryForList("SELECT * FROM banners ORDER BY sort_order"));
    }

    @PostMapping
    public Result<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        jdbc.update("INSERT INTO banners (title, subtitle, image_url, bg_color, link_type, link_value, sort_order) " +
                "VALUES (?,?,?,?,?,?,?)",
                body.get("title"), body.getOrDefault("subtitle", ""), body.getOrDefault("image_url", ""),
                body.getOrDefault("bg_color", "#22c55e"), body.getOrDefault("link_type", "route"),
                body.getOrDefault("link_value", ""), body.getOrDefault("sort_order", 0));
        Long id = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        return Result.success(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        jdbc.update("UPDATE banners SET title=?, subtitle=?, image_url=?, bg_color=?, link_type=?, link_value=?, " +
                "sort_order=?, updated_at=NOW() WHERE id=?",
                body.get("title"), body.getOrDefault("subtitle", ""), body.getOrDefault("image_url", ""),
                body.getOrDefault("bg_color", "#22c55e"), body.getOrDefault("link_type", "route"),
                body.getOrDefault("link_value", ""), body.getOrDefault("sort_order", 0), id);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        jdbc.update("DELETE FROM banners WHERE id = ?", id);
        return Result.success();
    }
}
