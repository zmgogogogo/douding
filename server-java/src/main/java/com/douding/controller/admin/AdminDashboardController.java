package com.douding.controller.admin;

import com.douding.common.Result;
import com.douding.service.admin.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** 管理后台仪表盘 — 替代 Express routes/admin/dashboard.js */
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService dashboardService;

    /** 综合统计 */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.success(dashboardService.getStats());
    }

    /** 趋势数据（近N天新增用户和设计） */
    @GetMapping("/trends")
    public Result<Map<String, Object>> trends(@RequestParam(defaultValue = "30") int days) {
        return Result.success(dashboardService.getTrends(Math.min(days, 365)));
    }

    /** 热门设计排行 */
    @GetMapping("/top-designs")
    public Result<?> topDesigns(@RequestParam(defaultValue = "10") int limit) {
        return Result.success(dashboardService.getTopDesigns(limit));
    }

    /** 品牌分布 */
    @GetMapping("/brand-distribution")
    public Result<?> brandDistribution() {
        return Result.success(dashboardService.getBrandDistribution());
    }

    /** 内容状态分布 */
    @GetMapping("/content-status")
    public Result<Map<String, Object>> contentStatus() {
        return Result.success(dashboardService.getContentStatusDistribution());
    }

    /** 最近操作日志 */
    @GetMapping("/recent-logs")
    public Result<?> recentLogs(@RequestParam(defaultValue = "10") int limit) {
        return Result.success(dashboardService.getRecentLogs(limit));
    }
}
