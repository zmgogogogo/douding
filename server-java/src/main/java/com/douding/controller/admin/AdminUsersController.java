package com.douding.controller.admin;

import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.security.AdminOperationLog;
import com.douding.service.admin.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** 管理后台：用户管理 — 替代 Express routes/admin/users.js */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUsersController {

    private final AdminUserService userService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") int page,
                          @RequestParam(defaultValue = "20") int limit,
                          @RequestParam(required = false) String keyword,
                          @RequestParam(required = false) Integer status,
                          @RequestParam(defaultValue = "created_at_desc") String sort) {
        var result = userService.listUsers(page, limit, keyword, status, sort);
        return Result.paginated(result.getRecords(), result.getTotal(), page, limit);
    }

    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable Long id) {
        Map<String, Object> data = userService.getUserDetail(id);
        if (data == null) throw AppException.notFound("用户不存在");
        return Result.success(data);
    }

    @PutMapping("/{id}")
    @AdminOperationLog(module = "用户管理", action = "update", targetType = "user")
    public Result<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        userService.updateUser(id,
                (String) body.get("nickname"),
                (String) body.get("bio"),
                body.get("isVip") instanceof Boolean b ? b : null,
                body.get("vipExpireAt") != null
                        ? java.time.LocalDateTime.parse(body.get("vipExpireAt").toString().replace("T", " ").substring(0, 19)) : null);
        return Result.success(Map.of("id", id));
    }

    @PutMapping("/{id}/status")
    @PatchMapping("/{id}/status")
    @AdminOperationLog(module = "用户管理", action = "封禁", targetType = "user")
    public Result<?> toggleStatus(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        int status = ((Number) body.get("status")).intValue();
        String reason = (String) body.getOrDefault("reason", "");
        userService.toggleUserStatus(id, status, reason);
        return Result.success(Map.of("id", id, "status", status, "reason", reason));
    }

    /** 重置用户密码 */
    @PutMapping("/{id}/reset-password")
    @com.douding.security.AdminOperationLog(module = "用户管理", action = "重置密码", targetType = "user")
    public Result<?> resetPassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newPassword = body.get("newPassword");
        String pwd = userService.resetPassword(id, newPassword);
        return Result.success(Map.of("id", id, "newPassword", pwd));
    }
}
