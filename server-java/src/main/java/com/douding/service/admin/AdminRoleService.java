package com.douding.service.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.douding.common.AppException;
import com.douding.entity.SysAdmin;
import com.douding.entity.SysRole;
import com.douding.mapper.SysAdminMapper;
import com.douding.mapper.SysRoleMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminRoleService {

    private final SysRoleMapper roleMapper;
    private final SysAdminMapper adminMapper;
    private static final ObjectMapper objectMapper = new ObjectMapper();

    public Page<Map<String, Object>> listRoles(int page, int limit) {
        Page<SysRole> rolePage = roleMapper.selectPage(new Page<>(page, limit),
                new LambdaQueryWrapper<SysRole>().orderByAsc(SysRole::getId));

        List<Map<String, Object>> list = rolePage.getRecords().stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId()); m.put("name", r.getName()); m.put("slug", r.getSlug());
            m.put("description", r.getDescription());
            m.put("permissions", safeParse(r.getPermissions()));
            m.put("status", r.getStatus());
            m.put("created_at", r.getCreatedAt());
            long adminCount = adminMapper.selectCount(
                    new LambdaQueryWrapper<SysAdmin>().eq(SysAdmin::getRoleId, r.getId()));
            m.put("admin_count", adminCount);
            return m;
        }).toList();

        Page<Map<String, Object>> result = new Page<>(page, limit);
        result.setTotal(rolePage.getTotal());
        result.setRecords(list);
        return result;
    }

    public List<Map<String, Object>> listAllRoles() {
        return roleMapper.selectList(
                new LambdaQueryWrapper<SysRole>().eq(SysRole::getStatus, 1).orderByAsc(SysRole::getId))
                .stream().map(r -> Map.<String, Object>of("id", r.getId(), "name", r.getName(), "slug", r.getSlug()))
                .toList();
    }

    @Transactional
    public void createRole(String name, String slug, String description, List<String> permissions) {
        SysRole existing = roleMapper.selectOne(new LambdaQueryWrapper<SysRole>().eq(SysRole::getSlug, slug));
        if (existing != null) throw AppException.badRequest("角色标识已存在");

        SysRole role = new SysRole();
        role.setName(name); role.setSlug(slug);
        role.setDescription(description != null ? description : "");
        try { role.setPermissions(objectMapper.writeValueAsString(permissions != null ? permissions : List.of())); }
        catch (Exception e) { role.setPermissions("[]"); }
        role.setStatus(1);
        roleMapper.insert(role);
    }

    @Transactional
    public void updateRole(Long id, String name, String description, List<String> permissions) {
        SysRole role = roleMapper.selectById(id);
        if (role == null) throw AppException.notFound("角色不存在");
        if (name != null) role.setName(name);
        if (description != null) role.setDescription(description);
        if (permissions != null) {
            try { role.setPermissions(objectMapper.writeValueAsString(permissions)); } catch (Exception e) {}
        }
        roleMapper.updateById(role);
    }

    @Transactional
    public void deleteRole(Long id) {
        SysRole role = roleMapper.selectById(id);
        if (role == null) throw AppException.notFound("角色不存在");
        long adminCount = adminMapper.selectCount(new LambdaQueryWrapper<SysAdmin>().eq(SysAdmin::getRoleId, id));
        if (adminCount > 0) throw AppException.badRequest("该角色下还有 " + adminCount + " 个管理员，请先转移后再删除");
        roleMapper.deleteById(id);
    }

    public List<Map<String, Object>> getPermissionsTree() {
        return List.of(
                Map.of("key", "dashboard", "label", "数据看板", "children",
                        List.of(Map.of("key", "admin:dashboard:read", "label", "查看看板"))),
                Map.of("key", "users", "label", "用户管理", "children", List.of(
                        Map.of("key", "admin:users:read", "label", "查看用户"),
                        Map.of("key", "admin:users:write", "label", "编辑用户"),
                        Map.of("key", "admin:users:ban", "label", "封禁/解封"))),
                Map.of("key", "content", "label", "内容管理", "children", List.of(
                        Map.of("key", "admin:designs:read", "label", "查看设计"),
                        Map.of("key", "admin:designs:write", "label", "编辑设计"),
                        Map.of("key", "admin:designs:delete", "label", "删除设计"),
                        Map.of("key", "admin:designs:review", "label", "审核设计"))),
                Map.of("key", "palette", "label", "色板物料", "children", List.of(
                        Map.of("key", "admin:palette:read", "label", "查看色板"),
                        Map.of("key", "admin:palette:write", "label", "编辑色板"))),
                Map.of("key", "operations", "label", "运营管理", "children", List.of(
                        Map.of("key", "admin:banners:read", "label", "查看Banner"),
                        Map.of("key", "admin:banners:write", "label", "编辑Banner"))),
                Map.of("key", "permissions", "label", "权限管理", "children", List.of(
                        Map.of("key", "admin:permissions:read", "label", "查看管理员/角色"),
                        Map.of("key", "admin:permissions:write", "label", "管理管理员/角色"))),
                Map.of("key", "logs", "label", "操作日志", "children",
                        List.of(Map.of("key", "admin:logs:read", "label", "查看日志")))
        );
    }

    private List<String> safeParse(String json) {
        try { return objectMapper.readValue(json, List.class); } catch (Exception e) { return List.of(); }
    }
}
