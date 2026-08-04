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
import com.douding.vo.UserVO;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
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

    /** 注册 */
    @PostMapping("/register")
    public Result<AuthService.AuthResult> register(@Valid @RequestBody RegisterDTO dto) {
        return Result.success(authService.register(dto));
    }

    /** 登录 */
    @PostMapping("/login")
    public Result<AuthService.AuthResult> login(@Valid @RequestBody LoginDTO dto) {
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
