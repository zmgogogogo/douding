package com.douding.controller;

import com.douding.common.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** 公共服务控制器 — 替代 routes/public.js */
@RestController
@RequestMapping("/api")
public class PublicController {

    @GetMapping("/version")
    public Result<Map<String, String>> version() {
        return Result.success(Map.of("version", "2.0.0", "buildTime", "2025-01-01"));
    }

    @GetMapping("/announcement")
    public Result<Map<String, String>> announcement() {
        return Result.success(Map.of("title", "欢迎来到豆丁", "content", "拼豆创作，从这里开始"));
    }

    @GetMapping("/health")
    public Result<String> health() {
        return Result.success("OK");
    }
}
