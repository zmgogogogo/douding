package com.douding.controller.admin;

import com.douding.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

/** 管理后台仪表盘 */
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final JdbcTemplate jdbc;

    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalUsers", jdbc.queryForObject("SELECT COUNT(*) FROM users", Long.class));
        data.put("totalDesigns", jdbc.queryForObject("SELECT COUNT(*) FROM designs", Long.class));
        data.put("publicDesigns", jdbc.queryForObject("SELECT COUNT(*) FROM designs WHERE is_public = 1", Long.class));
        data.put("todayDesigns", jdbc.queryForObject("SELECT COUNT(*) FROM designs WHERE DATE(created_at) = CURDATE()", Long.class));
        data.put("totalLikes", jdbc.queryForObject("SELECT COUNT(*) FROM design_likes", Long.class));
        data.put("totalComments", jdbc.queryForObject("SELECT COUNT(*) FROM design_comments WHERE deleted = 0", Long.class));
        return Result.success(data);
    }
}
