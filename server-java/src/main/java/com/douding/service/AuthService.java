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
    private final SmsService smsService;

    /**
     * 根据场景检查手机号状态
     * @param phone 手机号
     * @param scene register=需未注册, reset=需已注册, null=不检查
     */
    public void checkPhoneForScene(String phone, String scene) {
        if (phone == null || scene == null) return;
        long count = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getPhone, phone));
        if ("register".equals(scene) && count > 0)
            throw new AppException(409, "该手机号已注册，请直接登录");
        if ("reset".equals(scene) && count == 0)
            throw new AppException(404, "该手机号未注册");
    }

    /** 用户注册 — 手机号+验证码+密码 */
    @Transactional
    public AuthResult register(RegisterDTO dto) {
        // 1. 手机号格式
        if (dto.getPhone() == null || !dto.getPhone().matches("^1[3-9]\\d{9}$"))
            throw AppException.badRequest("请输入正确的手机号");

        // 2. 密码校验（先于验证码，减少无效短信消耗）
        if (dto.getPassword() == null || dto.getPassword().length() < 6)
            throw AppException.badRequest("密码至少需要6位");
        if (!dto.getPassword().equals(dto.getConfirmPassword()))
            throw AppException.badRequest("两次密码不一致");

        // 3. 手机号唯一性（先于验证码，避免消耗验证码后被409拒绝）
        Long phoneExists = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getPhone, dto.getPhone()));
        if (phoneExists > 0) throw new AppException(409, "该手机号已注册，请直接登录");

        // 4. 验证码校验（最后校验，避免前面失败浪费验证码）
        if (!smsService.verifyCode(dto.getPhone(), dto.getCode()))
            throw AppException.badRequest("验证码错误或已过期");

        // 5. 创建用户（用手机号后4位生成用户名，冲突时追加随机字符）
        User user = new User();
        String baseUsername = "u_" + dto.getPhone().substring(7);
        user.setUsername(generateUniqueUsername(baseUsername));
        user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        user.setPhone(dto.getPhone());
        user.setPhoneVerifiedAt(LocalDateTime.now());
        user.setNickname(dto.getNickname() != null && !dto.getNickname().isBlank()
                ? dto.getNickname() : "豆友" + dto.getPhone().substring(7));
        user.setStatus(1);
        userMapper.insert(user);

        String token = jwtTokenProvider.generateToken(user.getId(), user.getUsername());
        return new AuthResult(token, UserVO.from(user));
    }

    /** 生成唯一用户名，冲突时追加随机3位字符（最多重试5次） */
    private String generateUniqueUsername(String base) {
        // 先检查基准名是否可用
        Long exists = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getUsername, base));
        if (exists == 0) return base;
        // 冲突时追加随机后缀
        String chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        java.util.Random rng = new java.util.Random();
        for (int i = 0; i < 5; i++) {
            StringBuilder sb = new StringBuilder(base).append('_');
            for (int j = 0; j < 3; j++) sb.append(chars.charAt(rng.nextInt(chars.length())));
            String candidate = sb.toString();
            exists = userMapper.selectCount(
                    new LambdaQueryWrapper<User>().eq(User::getUsername, candidate));
            if (exists == 0) return candidate;
        }
        // 极端情况：用时间戳兜底
        return base + "_" + System.currentTimeMillis() % 100000;
    }

    /** 用户登录 */
    public AuthResult login(LoginDTO dto) {
        User user;

        // 手机号+密码登录
        if (dto.getPhone() != null && !dto.getPhone().isBlank()) {
            user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getPhone, dto.getPhone()));
            if (user == null) {
                if (dto.getPassword() != null) passwordEncoder.encode(dto.getPassword());
                throw new AppException(401, "手机号或密码错误");
            }
            if (!passwordEncoder.matches(dto.getPassword(), user.getPasswordHash()))
                throw new AppException(401, "手机号或密码错误");
        } else {
            // 用户名+密码登录（兼容）
            user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getUsername, dto.getUsername()));
            if (user == null) {
                if (dto.getPassword() != null) passwordEncoder.encode(dto.getPassword());
                throw new AppException(401, "用户名或密码错误");
            }
            if (!passwordEncoder.matches(dto.getPassword(), user.getPasswordHash()))
                throw new AppException(401, "用户名或密码错误");
        }

        if (user.getStatus() == 0) throw new AppException(403, "账号已被封禁");

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

    /** 忘记密码 — 短信验证码重置 */
    @Transactional
    public void resetPasswordByPhone(String phone, String code, String password, String confirmPassword) {
        if (!phone.matches("^1[3-9]\\d{9}$")) throw AppException.badRequest("请输入正确的手机号");
        if (!password.equals(confirmPassword)) throw AppException.badRequest("两次密码不一致");
        if (password.length() < 6) throw AppException.badRequest("密码至少需要6位");

        if (!smsService.verifyCode(phone, code)) throw AppException.badRequest("验证码错误或已过期");

        User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getPhone, phone));
        if (user == null) throw AppException.notFound("该手机号未注册");

        user.setPasswordHash(passwordEncoder.encode(password));
        userMapper.updateById(user);
    }

    /** 绑定手机号 */
    @Transactional
    public void bindPhone(Long userId, String phone) {
        if (phone == null || !phone.matches("^1[3-9]\\d{9}$")) throw AppException.badRequest("手机号格式不正确");
        // 检查手机号是否已被其他用户绑定
        User exist = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getPhone, phone));
        if (exist != null && !exist.getId().equals(userId)) throw AppException.badRequest("该手机号已被其他账号绑定");

        User user = userMapper.selectById(userId);
        if (user == null) throw AppException.notFound("用户不存在");
        user.setPhone(phone);
        user.setPhoneVerifiedAt(LocalDateTime.now());
        userMapper.updateById(user);
    }

    /** 认证结果 */
    public record AuthResult(String token, UserVO user) {}
}
