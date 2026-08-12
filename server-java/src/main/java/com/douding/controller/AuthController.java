package com.douding.controller;

import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.dto.LoginDTO;
import com.douding.dto.RegisterDTO;
import com.douding.dto.UpdateProfileDTO;
import com.douding.security.AuthRequired;
import com.douding.security.CurrentUser;
import com.douding.security.JwtTokenProvider;
import com.douding.service.AuthService;
import com.douding.service.SmsService;
import com.douding.vo.UserVO;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

/**
 * 认证控制器 — 替代 routes/auth.js
 * 注册 / 登录 / 个人信息
 */
@Tag(name = "认证")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final SmsService smsService;

    /** 注册 */
    @PostMapping("/register")
    public Result<AuthService.AuthResult> register(@RequestBody RegisterDTO dto) {
        return Result.success(authService.register(dto));
    }

    /** 登录 */
    @PostMapping("/login")
    public Result<AuthService.AuthResult> login(@RequestBody LoginDTO dto) {
        return Result.success(authService.login(dto));
    }

    /** 当前用户信息 */
    @GetMapping("/me")
    @AuthRequired
    public Result<UserVO> me(@CurrentUser JwtTokenProvider.TokenClaims claims) {
        return Result.success(authService.getCurrentUser(claims.id()));
    }

    /** 更新个人资料（支持头像上传） */
    @PutMapping("/profile")
    @AuthRequired
    public Result<UserVO> updateProfile(
            @CurrentUser JwtTokenProvider.TokenClaims claims,
            @RequestParam(value = "nickname", required = false) String nickname,
            @RequestParam(value = "bio", required = false) String bio,
            @RequestParam(value = "avatar", required = false) MultipartFile avatar) {

        UpdateProfileDTO dto = new UpdateProfileDTO();
        dto.setNickname(nickname);
        dto.setBio(bio);

        String avatarPath = null;
        if (avatar != null && !avatar.isEmpty()) {
            avatarPath = saveAvatar(avatar);
        }

        // 至少要有一样更新内容
        if (nickname == null && bio == null && avatarPath == null) {
            throw AppException.badRequest("没有要更新的内容");
        }

        return Result.success(authService.updateProfile(claims.id(), dto, avatarPath));
    }

    /** 发送短信验证码（scene: register=注册需手机号未注册, reset=重置密码需手机号已注册） */
    @PostMapping("/send-code")
    public Result<Void> sendCode(@RequestBody Map<String, String> body, HttpServletRequest req) {
        String phone = body.get("phone");
        String scene = body.get("scene");
        authService.checkPhoneForScene(phone, scene);
        smsService.sendCode(phone, getClientIp(req));
        return Result.success();
    }

    /** 忘记密码 — 短信验证码重置密码 */
    @PutMapping("/reset-password")
    public Result<Void> resetPassword(@RequestBody Map<String, String> body) {
        authService.resetPasswordByPhone(
                body.get("phone"), body.get("code"),
                body.get("password"), body.get("confirmPassword"));
        return Result.success();
    }

    /** 绑定手机号（需登录） */
    @PostMapping("/bind-phone")
    @AuthRequired
    public Result<Void> bindPhone(@CurrentUser JwtTokenProvider.TokenClaims claims,
                                   @RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String code = body.get("code");
        if (!smsService.verifyCode(phone, code)) throw AppException.badRequest("验证码错误或已过期");
        authService.bindPhone(claims.id(), phone);
        return Result.success();
    }

    private String getClientIp(HttpServletRequest req) {
        String ip = req.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) return ip.split(",")[0].trim();
        ip = req.getHeader("X-Real-IP");
        if (ip != null && !ip.isBlank()) return ip;
        return req.getRemoteAddr();
    }

    /** 保存头像文件 */
    private String saveAvatar(MultipartFile file) {
        try {
            // 确保上传目录存在
            File uploadDir = new File(System.getProperty("user.home") + "/first-cc/public/uploads");
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            String originalName = file.getOriginalFilename();
            String ext = "";
            if (originalName != null && originalName.contains(".")) {
                ext = originalName.substring(originalName.lastIndexOf("."));
            }
            String filename = "avatar_" + UUID.randomUUID().toString().substring(0, 8) + ext;

            File dest = new File(uploadDir, filename);
            file.transferTo(dest);

            return "/uploads/" + filename;
        } catch (IOException e) {
            throw new AppException(500, "头像上传失败: " + e.getMessage());
        }
    }
}
