package com.douding.service.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.douding.common.AppException;
import com.douding.entity.Design;
import com.douding.entity.User;
import com.douding.mapper.*;
import com.douding.vo.UserVO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserMapper userMapper;
    private final DesignMapper designMapper;
    private final PasswordEncoder passwordEncoder;

    /** 用户列表（分页+筛选） */
    public Page<UserVO> listUsers(int page, int limit, String keyword, Integer status, String sort) {
        LambdaQueryWrapper<User> qw = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            qw.and(w -> w.like(User::getUsername, keyword).or().like(User::getNickname, keyword));
        }
        if (status != null) qw.eq(User::getStatus, status);

        if ("created_at_asc".equals(sort)) qw.orderByAsc(User::getCreatedAt);
        else qw.orderByDesc(User::getCreatedAt);

        Page<User> userPage = userMapper.selectPage(new Page<>(page, limit), qw);
        List<UserVO> list = userPage.getRecords().stream().map(u -> {
            Long designCount = designMapper.selectCount(
                    new LambdaQueryWrapper<Design>().eq(Design::getUserId, u.getId()));
            UserVO vo = toVO(u);
            vo.setDesignCount(designCount);
            return vo;
        }).toList();

        Page<UserVO> result = new Page<>(page, limit);
        result.setTotal(userPage.getTotal());
        result.setRecords(list);
        return result;
    }

    /** 用户详情 */
    public Map<String, Object> getUserDetail(Long id) {
        User u = userMapper.selectById(id);
        if (u == null) return null;

        Long designCount = designMapper.selectCount(new LambdaQueryWrapper<Design>().eq(Design::getUserId, id));
        Long inventoryCount = 0L; // 简化
        Long likeCount = 0L; // 简化
        List<Map<String, Object>> recentDesigns = designMapper.selectList(
                new LambdaQueryWrapper<Design>().eq(Design::getUserId, id)
                        .orderByDesc(Design::getCreatedAt).last("LIMIT 50"))
                .stream().map(d -> Map.<String, Object>of(
                        "id", d.getId(), "title", d.getTitle(),
                        "isPublic", d.getIsPublic(), "likesCount", d.getLikesCount(),
                        "viewsCount", d.getViewsCount(), "createdAt", d.getCreatedAt()
                )).toList();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", u.getId());
        data.put("username", u.getUsername());
        data.put("nickname", u.getNickname());
        data.put("avatar", u.getAvatar());
        data.put("status", u.getStatus());
        data.put("banReason", u.getBanReason());
        data.put("isVip", u.getIsVip() == 1);
        data.put("vipExpireAt", u.getVipExpireAt());
        data.put("bio", u.getBio());
        data.put("phone", u.getPhone());
        data.put("phoneVerified", u.getPhoneVerifiedAt() != null);
        data.put("createdAt", u.getCreatedAt());
        data.put("updatedAt", u.getUpdatedAt());
        data.put("designCount", designCount);
        data.put("inventoryCount", inventoryCount);
        data.put("likeCount", likeCount);
        data.put("recentDesigns", recentDesigns);
        return data;
    }

    /** 编辑用户资料 */
    @Transactional
    public void updateUser(Long id, String nickname, String bio, Boolean isVip, LocalDateTime vipExpireAt) {
        User u = userMapper.selectById(id);
        if (u == null) return;
        if (nickname != null) u.setNickname(nickname);
        if (bio != null) u.setBio(bio);
        if (isVip != null) u.setIsVip(isVip ? 1 : 0);
        if (vipExpireAt != null) u.setVipExpireAt(vipExpireAt);
        userMapper.updateById(u);
    }

    /** 封禁/解封 */
    @Transactional
    public void toggleUserStatus(Long id, Integer status, String reason) {
        User u = userMapper.selectById(id);
        if (u == null) return;
        u.setStatus(status);
        if (status == 0) {
            u.setBanReason(reason != null ? reason : "");
            u.setBannedAt(LocalDateTime.now());
        } else {
            u.setBanReason("");
            u.setBannedAt(null);
        }
        userMapper.updateById(u);
    }

    /** 重置用户密码 */
    @Transactional
    public String resetPassword(Long id, String newPassword) {
        if (newPassword == null || newPassword.length() < 6)
            throw AppException.badRequest("密码长度不能少于6位");
        User u = userMapper.selectById(id);
        if (u == null) throw AppException.notFound("用户不存在");
        u.setPasswordHash(passwordEncoder.encode(newPassword));
        userMapper.updateById(u);
        return newPassword;
    }

    private UserVO toVO(User u) {
        UserVO vo = new UserVO();
        vo.setId(u.getId());
        vo.setUsername(u.getUsername());
        vo.setNickname(u.getNickname());
        vo.setAvatar(u.getAvatar());
        vo.setBio(u.getBio());
        vo.setIsVip(u.getIsVip());
        vo.setStatus(u.getStatus());
        vo.setBanReason(u.getBanReason());
        vo.setPhone(u.getPhone());
        vo.setPhoneVerified(u.getPhoneVerifiedAt() != null);
        vo.setCreatedAt(u.getCreatedAt());
        vo.setUpdatedAt(u.getUpdatedAt());
        return vo;
    }
}
