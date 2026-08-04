package com.douding.controller.admin;

import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** 管理后台认证 */
@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/login")
    public Result<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        if (username == null || password == null) throw AppException.badRequest("请输入用户名和密码");

        Map<String, Object> admin = queryForMapOrNull(
                "SELECT * FROM sys_admins WHERE username = ? AND status = 1", username);
        if (admin == null) throw AppException.unauthorized("用户名或密码错误");

        String hash = (String) admin.get("password_hash");
        if (!passwordEncoder.matches(password, hash)) throw AppException.unauthorized("用户名或密码错误");

        String token = jwtTokenProvider.generateAdminToken(
                ((Number) admin.get("id")).longValue(), username);

        jdbc.update("UPDATE sys_admins SET last_login_at = NOW() WHERE id = ?", admin.get("id"));

        return Result.success(Map.of("token", token, "admin", Map.of(
                "id", admin.get("id"), "username", admin.get("username"),
                "nickname", admin.getOrDefault("nickname", ""), "roleId", admin.getOrDefault("role_id", 0))));
    }

    @GetMapping("/me")
    public Result<Map<String, Object>> me() {
        // 简化实现：由 JWT Filter 处理
        return Result.success(Map.of("ok", true));
    }

    private Map<String, Object> queryForMapOrNull(String sql, Object... params) {
        try { return jdbc.queryForMap(sql, params); } catch (Exception e) { return null; }
    }
}
