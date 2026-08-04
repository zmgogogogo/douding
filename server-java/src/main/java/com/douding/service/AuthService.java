package com.douding.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.douding.common.AppException;
import com.douding.dto.LoginDTO;
import com.douding.dto.RegisterDTO;
import com.douding.dto.UpdateProfileDTO;
import com.douding.entity.User;
import com.douding.mapper.UserMapper;
import com.douding.security.JwtTokenProvider;
import com.douding.vo.UserVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 认证服务 — 替代 routes/auth.js 中的业务逻辑
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    /** 用户注册 */
    @Transactional
    public AuthResult register(RegisterDTO dto) {
        // 检查用户名唯一性
        Long exists = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getUsername, dto.getUsername()));
        if (exists > 0) {
            throw new AppException(409, "用户名已存在");
        }

        // 创建用户
        User user = new User();
        user.setUsername(dto.getUsername());
        user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        user.setNickname(dto.getNickname() != null ? dto.getNickname() : dto.getUsername());
        user.setStatus(1);
        userMapper.insert(user);

        // 签发 Token
        String token = jwtTokenProvider.generateToken(user.getId(), user.getUsername());
        return new AuthResult(token, UserVO.from(user));
    }

    /** 用户登录 */
    public AuthResult login(LoginDTO dto) {
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getUsername, dto.getUsername()));

        if (user == null) {
            // 用户名不存在时，仍执行一次 hash 防止时序攻击
            passwordEncoder.encode(dto.getPassword());
            throw new AppException(401, "用户名或密码错误");
        }

        if (!passwordEncoder.matches(dto.getPassword(), user.getPasswordHash())) {
            throw new AppException(401, "用户名或密码错误");
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getUsername());
        return new AuthResult(token, UserVO.from(user));
    }

    /** 获取当前用户信息 */
    public UserVO getCurrentUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw AppException.notFound("用户不存在");
        }
        return UserVO.from(user);
    }

    /** 更新个人资料 */
    @Transactional
    public UserVO updateProfile(Long userId, UpdateProfileDTO dto, String avatarPath) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw AppException.notFound("用户不存在");
        }

        if (dto.getNickname() != null) {
            user.setNickname(dto.getNickname());
        }
        if (dto.getBio() != null) {
            user.setBio(dto.getBio());
        }
        if (avatarPath != null) {
            user.setAvatar(avatarPath);
        }
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);

        return UserVO.from(user);
    }

    /** 认证结果 */
    public record AuthResult(String token, UserVO user) {}
}
