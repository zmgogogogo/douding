package com.douding.controller.admin;

import com.douding.common.Result;
import com.douding.security.AdminOperationLog;
import com.douding.service.admin.AdminAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** 管理后台：管理员账号管理 — 替代 Express routes/admin/admins.js */
@RestController
@RequestMapping("/api/admin/admins")
@RequiredArgsConstructor
public class AdminAdminsController {

    private final AdminAdminService adminService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") int page,
                          @RequestParam(defaultValue = "20") int limit,
                          @RequestParam(required = false) String keyword,
                          @RequestParam(required = false) Integer status) {
        var result = adminService.listAdmins(page, limit, keyword, status);
        return Result.paginated(result.getRecords(), result.getTotal(), page, limit);
    }

    @PostMapping
    @AdminOperationLog(module = "权限管理", action = "create", targetType = "admin")
    public Result<?> create(@RequestBody Map<String, Object> body) {
        String username = (String) body.get("username");
        String password = (String) body.get("password");
        String nickname = (String) body.get("nickname");
        Long roleId = body.get("roleId") instanceof Number n ? n.longValue() : null;
        adminService.createAdmin(username, password, nickname, roleId);
        return Result.success(Map.of("username", username));
    }

    @PutMapping("/{id}")
    @AdminOperationLog(module = "权限管理", action = "update", targetType = "admin")
    public Result<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String nickname = (String) body.get("nickname");
        Long roleId = body.get("roleId") instanceof Number n ? n.longValue() : null;
        Integer status = body.get("status") instanceof Number n ? n.intValue() : null;
        adminService.updateAdmin(id, nickname, roleId, status);
        return Result.success(Map.of("id", id));
    }

    @PutMapping("/{id}/reset-password")
    @AdminOperationLog(module = "权限管理", action = "reset_password", targetType = "admin")
    public Result<?> resetPassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        adminService.resetPassword(id, body.get("newPassword"));
        return Result.success();
    }
}
