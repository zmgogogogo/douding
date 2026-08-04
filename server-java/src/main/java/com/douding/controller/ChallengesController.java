package com.douding.controller;

import com.douding.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.*;

/** 每日挑战控制器 — 替代 routes/challenges.js */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ChallengesController {

    private final JdbcTemplate jdbc;
    private static final List<Map<String, String>> THEMES = Arrays.asList(
            Map.of("zh", "可爱小动物", "en", "Cute Animal"),
            Map.of("zh", "水果", "en", "Fruit"),
            Map.of("zh", "像素表情", "en", "Pixel Emoji"),
            Map.of("zh", "花朵", "en", "Flower"),
            Map.of("zh", "太空", "en", "Space"),
            Map.of("zh", "海洋生物", "en", "Ocean Life"),
            Map.of("zh", "甜品", "en", "Dessert"),
            Map.of("zh", "蘑菇", "en", "Mushroom"),
            Map.of("zh", "机器人", "en", "Robot"),
            Map.of("zh", "星星", "en", "Star"),
            Map.of("zh", "爱心", "en", "Heart"),
            Map.of("zh", "城堡", "en", "Castle"),
            Map.of("zh", "恐龙", "en", "Dinosaur"),
            Map.of("zh", "独角兽", "en", "Unicorn"),
            Map.of("zh", "彩虹", "en", "Rainbow"),
            Map.of("zh", "猫", "en", "Cat"),
            Map.of("zh", "狗", "en", "Dog")
    );

    @GetMapping("/challenge/today")
    public Result<Map<String, Object>> today() {
        int dayOfYear = LocalDate.now().getDayOfYear();
        Map<String, String> theme = THEMES.get(dayOfYear % THEMES.size());
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM designs WHERE is_public = 1 AND DATE(created_at) = CURDATE()", Long.class);

        return Result.success(Map.of("zh", theme.get("zh"), "en", theme.get("en"),
                "date", LocalDate.now().toString(), "submissionCount", count != null ? count : 0));
    }

    @GetMapping("/challenges/upcoming")
    public Result<List<Map<String, Object>>> upcoming() {
        int dayOfYear = LocalDate.now().getDayOfYear();
        List<Map<String, Object>> list = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            Map<String, String> theme = THEMES.get((dayOfYear + i) % THEMES.size());
            list.add(Map.of("zh", theme.get("zh"), "en", theme.get("en"),
                    "date", LocalDate.now().plusDays(i).toString()));
        }
        return Result.success(list);
    }
}
