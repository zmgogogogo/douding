package com.douding.service.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.douding.common.AppException;
import com.douding.entity.SysAdmin;
import com.douding.entity.SysRole;
import com.douding.mapper.SysAdminMapper;
import com.douding.mapper.SysRoleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminAdminService {

    private final SysAdminMapper adminMapper;
    private final SysRoleMapper roleMapper;
    private final PasswordEncoder passwordEncoder;

    public Page<Map<String, Object>> listAdmins(int page, int limit, String keyword, Integer status) {
        LambdaQueryWrapper<SysAdmin> qw = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank())
            qw.and(w -> w.like(SysAdmin::getUsername, keyword).or().like(SysAdmin::getNickname, keyword));
        if (status != null) qw.eq(SysAdmin::getStatus, status);
        qw.orderByAsc(SysAdmin::getCreatedAt);

        Page<SysAdmin> adminPage = adminMapper.selectPage(new Page<>(page, limit), qw);
        List<Map<String, Object>> list = adminPage.getRecords().stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId()); m.put("username", a.getUsername());
            m.put("nickname", a.getNickname()); m.put("status", a.getStatus());
            m.put("role_id", a.getRoleId());
            m.put("last_login_at", a.getLastLoginAt());
            m.put("last_login_ip", a.getLastLoginIp());
            m.put("created_at", a.getCreatedAt());
            if (a.getRoleId() != null && a.getRoleId() > 0) {
                SysRole role = roleMapper.selectById(a.getRoleId());
                m.put("role_name", role != null ? role.getName() : "");
            } else {
                m.put("role_name", "");
            }
            return m;
        }).toList();

        Page<Map<String, Object>> result = new Page<>(page, limit);
        result.setTotal(adminPage.getTotal());
        result.setRecords(list);
        return result;
    }

    @Transactional
    public void createAdmin(String username, String password, String nickname, Long roleId) {
        if (password.length() < 6) throw AppException.badRequest("密码长度不能少于6位");
        SysAdmin existing = adminMapper.selectOne(
                new LambdaQueryWrapper<SysAdmin>().eq(SysAdmin::getUsername, username));
        if (existing != null) throw AppException.badRequest("账号已存在");

        SysAdmin admin = new SysAdmin();
        admin.setUsername(username);
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setNickname(nickname != null ? nickname : username);
        admin.setRoleId(roleId != null ? roleId : 0L);
        admin.setStatus(1);
        adminMapper.insert(admin);
    }

    @Transactional
    public void updateAdmin(Long id, String nickname, Long roleId, Integer status) {
        SysAdmin admin = adminMapper.selectById(id);
        if (admin == null) throw AppException.notFound("管理员不存在");
        if (nickname != null) admin.setNickname(nickname);
        if (roleId != null) admin.setRoleId(roleId);
        if (status != null) admin.setStatus(status);
        adminMapper.updateById(admin);
    }

    @Transactional
    public void resetPassword(Long id, String newPassword) {
        if (newPassword == null || newPassword.length() < 6) throw AppException.badRequest("新密码长度不能少于6位");
        SysAdmin admin = adminMapper.selectById(id);
        if (admin == null) throw AppException.notFound("管理员不存在");
        admin.setPasswordHash(passwordEncoder.encode(newPassword));
        adminMapper.updateById(admin);
    }
}
