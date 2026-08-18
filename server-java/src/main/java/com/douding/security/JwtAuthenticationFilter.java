package com.douding.security;

import com.douding.entity.SysAdmin;
import com.douding.entity.SysRole;
import com.douding.mapper.SysAdminMapper;
import com.douding.mapper.SysRoleMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * JWT 认证过滤器 — 替代 Express middleware/auth.js
 * 解析请求头 Authorization: Bearer <token>，验证并挂载用户信息
 *
 * 管理端请求 (/api/admin/**) 还会加载管理员权限信息
 */
@Slf4j
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final SysAdminMapper sysAdminMapper;
    private final SysRoleMapper sysRoleMapper;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider,
                                    SysAdminMapper sysAdminMapper,
                                    SysRoleMapper sysRoleMapper) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.sysAdminMapper = sysAdminMapper;
        this.sysRoleMapper = sysRoleMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String token = extractToken(request);
        if (token != null) {
            try {
                boolean isAdminPath = request.getRequestURI().startsWith("/api/admin/");

                if (isAdminPath) {
                    // 管理端：验证管理员 Token + 加载权限
                    JwtTokenProvider.TokenClaims claims = jwtTokenProvider.verifyAdminToken(token);
                    loadAdminAuth(claims);
                } else {
                    // C 端：验证用户 Token
                    JwtTokenProvider.TokenClaims claims = jwtTokenProvider.verifyToken(token);
                    var auth = new org.springframework.security.authentication
                            .UsernamePasswordAuthenticationToken(claims, null, Collections.emptyList());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }

            } catch (Exception e) {
                log.debug("JWT 验证失败: {}", e.getMessage());
                // 不在此处拒绝，交给后续的 @AuthRequired 注解处理
            }
        }

        filterChain.doFilter(request, response);
    }

    /** 加载管理员认证信息（含权限） */
    private void loadAdminAuth(JwtTokenProvider.TokenClaims claims) {
        SysAdmin admin = sysAdminMapper.selectById(claims.id());
        if (admin == null || admin.getStatus() == null || admin.getStatus() != 1) {
            return; // 管理员不存在或已禁用
        }

        // 加载角色权限
        List<String> permissions = new ArrayList<>();
        Long roleId = admin.getRoleId();
        if (roleId != null && roleId > 0) {
            SysRole role = sysRoleMapper.selectById(roleId);
            if (role != null && role.getPermissions() != null) {
                permissions = parsePermissions(role.getPermissions());
            }
        }

        // 构建带权限的认证令牌
        AdminAuthenticationToken auth = new AdminAuthenticationToken(
                claims, admin.getId(), admin.getUsername(), roleId, permissions);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    /** 解析权限 JSON 字符串为字符串列表 */
    private List<String> parsePermissions(String permissionsJson) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(permissionsJson, List.class);
        } catch (Exception e) {
            log.warn("解析管理员权限失败: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /** 从 Authorization 头提取 Token */
    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
