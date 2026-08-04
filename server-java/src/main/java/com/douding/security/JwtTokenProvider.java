package com.douding.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT Token 工具 — 替代 server/utils/jwt.js
 * 签发和验证 JWT Token
 */
@Slf4j
@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final SecretKey adminKey;

    /** Token 过期时间（毫秒） */
    @Getter
    private final long expirationMs;

    private final long adminExpirationMs;

    public JwtTokenProvider(
            @Value("${douding.jwt.secret}") String secret,
            @Value("${douding.jwt.admin-secret}") String adminSecret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.adminKey = Keys.hmacShaKeyFor(adminSecret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = 30L * 24 * 60 * 60 * 1000; // 30 天
        this.adminExpirationMs = 12L * 60 * 60 * 1000;  // 12 小时
    }

    /** 签发用户 Token */
    public String generateToken(Long userId, String username) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("id", userId)
                .claim("username", username)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    /** 签发管理员 Token */
    public String generateAdminToken(Long adminId, String username) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(adminId))
                .claim("id", adminId)
                .claim("username", username)
                .claim("isAdmin", true)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + adminExpirationMs))
                .signWith(adminKey)
                .compact();
    }

    /** 验证用户 Token 并返回载荷 */
    public TokenClaims verifyToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return new TokenClaims(
                claims.get("id", Long.class),
                claims.get("username", String.class),
                false
        );
    }

    /** 验证管理员 Token 并返回载荷 */
    public TokenClaims verifyAdminToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(adminKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return new TokenClaims(
                claims.get("id", Long.class),
                claims.get("username", String.class),
                true
        );
    }

    /**
     * Token 载荷
     */
    public record TokenClaims(Long id, String username, boolean isAdmin) {}
}
