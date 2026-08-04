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

/** 文件夹管理控制器 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FoldersController {

    private final JdbcTemplate jdbc;

    @GetMapping("/folders")
    @AuthRequired
    public Result<List<Map<String, Object>>> list(@CurrentUser JwtTokenProvider.TokenClaims claims) {
        return Result.success(jdbc.queryForList(
                "SELECT * FROM folders WHERE user_id = ? ORDER BY sort_order, created_at", claims.id()));
    }

    @PostMapping("/folders")
    @AuthRequired
    public Result<Map<String, Object>> create(@RequestBody Map<String, Object> body,
                                                @CurrentUser JwtTokenProvider.TokenClaims claims) {
        String name = (String) body.get("name");
        if (name == null || name.isBlank()) throw AppException.badRequest("文件夹名称不能为空");
        jdbc.update("INSERT INTO folders (user_id, name) VALUES (?,?)", claims.id(), name);
        Long id = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        return Result.success(Map.of("id", id, "name", name));
    }

    @PutMapping("/folders/{id}")
    @AuthRequired
    public Result<Void> rename(@PathVariable Long id, @RequestBody Map<String, String> body,
                                @CurrentUser JwtTokenProvider.TokenClaims claims) {
        jdbc.update("UPDATE folders SET name=? WHERE id=? AND user_id=?", body.get("name"), id, claims.id());
        return Result.success();
    }

    @DeleteMapping("/folders/{id}")
    @AuthRequired
    public Result<Void> delete(@PathVariable Long id, @CurrentUser JwtTokenProvider.TokenClaims claims) {
        jdbc.update("DELETE FROM folders WHERE id=? AND user_id=?", id, claims.id());
        return Result.success();
    }
}
