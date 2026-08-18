package com.douding.controller.admin;

import com.douding.common.Result;
import com.douding.security.AdminOperationLog;
import com.douding.service.admin.AdminRoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** 管理后台：角色管理 — 替代 Express routes/admin/roles.js */
@RestController
@RequestMapping("/api/admin/roles")
@RequiredArgsConstructor
public class AdminRolesController {

    private final AdminRoleService roleService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") int page,
                          @RequestParam(defaultValue = "20") int limit) {
        var result = roleService.listRoles(page, limit);
        return Result.paginated(result.getRecords(), result.getTotal(), page, limit);
    }

    @GetMapping("/all")
    public Result<List<Map<String, Object>>> allRoles() {
        return Result.success(roleService.listAllRoles());
    }

    @PostMapping
    @AdminOperationLog(module = "权限管理", action = "create", targetType = "role")
    public Result<?> create(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String slug = (String) body.get("slug");
        String description = (String) body.get("description");
        @SuppressWarnings("unchecked")
        List<String> permissions = (List<String>) body.get("permissions");
        roleService.createRole(name, slug, description, permissions);
        return Result.success(Map.of("name", name));
    }

    @PutMapping("/{id}")
    @AdminOperationLog(module = "权限管理", action = "update", targetType = "role")
    public Result<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String description = (String) body.get("description");
        @SuppressWarnings("unchecked")
        List<String> permissions = (List<String>) body.get("permissions");
        roleService.updateRole(id, name, description, permissions);
        return Result.success(Map.of("id", id));
    }

    @DeleteMapping("/{id}")
    @AdminOperationLog(module = "权限管理", action = "delete", targetType = "role")
    public Result<?> delete(@PathVariable Long id) {
        roleService.deleteRole(id);
        return Result.success();
    }

    @GetMapping("/permissions-tree")
    public Result<List<Map<String, Object>>> permissionsTree() {
        return Result.success(roleService.getPermissionsTree());
    }
}
