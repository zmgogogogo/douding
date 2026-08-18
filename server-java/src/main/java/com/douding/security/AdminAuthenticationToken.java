package com.douding.security;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.Collections;
import java.util.List;

/**
 * 管理员认证令牌 — 扩展 Spring Security 认证对象
 * 携带管理员权限信息，供 @AdminPermission 切面使用
 */
public class AdminAuthenticationToken extends UsernamePasswordAuthenticationToken {

    private final Long adminId;
    private final String adminName;
    private final Long roleId;
    private final List<String> permissions;

    public AdminAuthenticationToken(
            JwtTokenProvider.TokenClaims claims,
            Long adminId,
            String adminName,
            Long roleId,
            List<String> permissions) {
        super(claims, null, Collections.emptyList());
        this.adminId = adminId;
        this.adminName = adminName;
        this.roleId = roleId;
        this.permissions = permissions != null ? permissions : Collections.emptyList();
    }

    public Long getAdminId() { return adminId; }
    public String getAdminName() { return adminName; }
    public Long getRoleId() { return roleId; }
    public List<String> getPermissions() { return permissions; }

    /** 是否超级管理员（roleId=0 或无角色） */
    public boolean isSuperAdmin() {
        return roleId == null || roleId == 0;
    }

    /** 检查是否拥有任一权限 */
    public boolean hasAnyPermission(String... perms) {
        if (isSuperAdmin()) return true;
        for (String perm : perms) {
            if (permissions.contains(perm)) return true;
        }
        return false;
    }
}
