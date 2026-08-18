package com.douding.service.admin;

import com.douding.common.AppException;
import com.douding.entity.SysAdmin;
import com.douding.entity.SysRole;
import com.douding.mapper.SysAdminMapper;
import com.douding.mapper.SysRoleMapper;
import com.douding.security.JwtTokenProvider;
import com.douding.vo.AdminVO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private final SysAdminMapper adminMapper;
    private final SysRoleMapper roleMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    /** 管理员登录 */
    public AdminVO login(String username, String password, String ip, String userAgent) {
        SysAdmin admin = adminMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SysAdmin>()
                        .eq(SysAdmin::getUsername, username));
        if (admin == null) throw AppException.unauthorized("账号或密码错误");
        if (admin.getStatus() == null || admin.getStatus() != 1) throw AppException.forbidden("账号已被禁用，请联系超级管理员");
        if (!passwordEncoder.matches(password, admin.getPasswordHash())) throw AppException.unauthorized("账号或密码错误");

        // 加载权限
        List<String> permissions = loadPermissions(admin.getRoleId());

        // 更新登录信息
        admin.setLastLoginAt(java.time.LocalDateTime.now());
        admin.setLastLoginIp(ip);
        adminMapper.updateById(admin);

        // 生成 Token
        String token = jwtTokenProvider.generateAdminToken(admin.getId(), admin.getUsername());

        return AdminVO.builder()
                .token(token)
                .id(admin.getId()).username(admin.getUsername())
                .nickname(admin.getNickname()).avatar(admin.getAvatar())
                .roleId(admin.getRoleId()).permissions(permissions).build();
    }

    /** 获取当前管理员信息 */
    public AdminVO getMe(Long adminId) {
        SysAdmin admin = adminMapper.selectById(adminId);
        if (admin == null) throw AppException.notFound("管理员不存在");
        List<String> permissions = loadPermissions(admin.getRoleId());
        return AdminVO.builder()
                .id(admin.getId()).username(admin.getUsername())
                .nickname(admin.getNickname()).avatar(admin.getAvatar())
                .roleId(admin.getRoleId()).permissions(permissions)
                .createdAt(admin.getCreatedAt()).build();
    }

    /** 修改密码 */
    @Transactional
    public void changePassword(Long adminId, String oldPassword, String newPassword) {
        if (newPassword == null || newPassword.length() < 6) throw AppException.badRequest("新密码长度不能少于6位");
        SysAdmin admin = adminMapper.selectById(adminId);
        if (!passwordEncoder.matches(oldPassword, admin.getPasswordHash())) throw AppException.badRequest("旧密码错误");

        admin.setPasswordHash(passwordEncoder.encode(newPassword));
        adminMapper.updateById(admin);
    }

    private List<String> loadPermissions(Long roleId) {
        if (roleId == null || roleId == 0) return new ArrayList<>();
        SysRole role = roleMapper.selectById(roleId);
        if (role == null || role.getPermissions() == null) return new ArrayList<>();
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(role.getPermissions(), List.class);
        } catch (Exception e) { return new ArrayList<>(); }
    }
}
