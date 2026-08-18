package com.douding.controller.admin;

import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.security.AdminAuthenticationToken;
import com.douding.security.AdminOperationLog;
import com.douding.service.admin.AdminAuthService;
import com.douding.vo.AdminVO;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** 管理后台认证 */
@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService authService;

    /** 管理员登录 */
    @PostMapping("/login")
    @AdminOperationLog(module = "认证", action = "login")
    public Result<Map<String, Object>> login(@RequestBody Map<String, String> body,
                                              HttpServletRequest request) {
        String username = body.get("username");
        String password = body.get("password");
        if (username == null || password == null) throw AppException.badRequest("请输入账号和密码");

        AdminVO vo = authService.login(username, password,
                getClientIp(request), request.getHeader("User-Agent"));

        return Result.success(Map.of(
                "token", vo.getToken(),
                "admin", Map.of(
                        "id", vo.getId(),
                        "username", vo.getUsername(),
                        "nickname", vo.getNickname() != null ? vo.getNickname() : "",
                        "avatar", vo.getAvatar() != null ? vo.getAvatar() : "",
                        "roleId", vo.getRoleId() != null ? vo.getRoleId() : 0,
                        "permissions", vo.getPermissions() != null ? vo.getPermissions() : java.util.Collections.emptyList()
                )));
    }

    /** 获取当前管理员信息 */
    @GetMapping("/me")
    public Result<Map<String, Object>> me() {
        AdminAuthenticationToken auth = (AdminAuthenticationToken)
                SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw AppException.unauthorized("请先登录管理后台");

        AdminVO vo = authService.getMe(auth.getAdminId());
        return Result.success(Map.of(
                "id", vo.getId(),
                "username", vo.getUsername(),
                "nickname", vo.getNickname() != null ? vo.getNickname() : "",
                "avatar", vo.getAvatar() != null ? vo.getAvatar() : "",
                "roleId", vo.getRoleId() != null ? vo.getRoleId() : 0,
                "permissions", vo.getPermissions() != null ? vo.getPermissions() : java.util.Collections.emptyList(),
                "createdAt", vo.getCreatedAt() != null ? vo.getCreatedAt().toString() : null
        ));
    }

    /** 修改密码 */
    @PutMapping("/password")
    @AdminOperationLog(module = "认证", action = "update_password")
    public Result<Void> changePassword(@RequestBody Map<String, String> body) {
        AdminAuthenticationToken auth = (AdminAuthenticationToken)
                SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw AppException.unauthorized("请先登录管理后台");

        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");
        if (oldPassword == null || newPassword == null) throw AppException.badRequest("请输入旧密码和新密码");

        authService.changePassword(auth.getAdminId(), oldPassword, newPassword);
        return Result.success();
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) return ip.split(",")[0].trim();
        ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) return ip;
        return request.getRemoteAddr();
    }
}
