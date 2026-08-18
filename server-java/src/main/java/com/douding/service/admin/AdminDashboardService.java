package com.douding.service.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final JdbcTemplate jdbc;

    @Cacheable(value = "dashboard:stats", unless = "#result == null")
    public Map<String, Object> getStats() {
        String today = LocalDate.now().toString();
        String yesterday = LocalDate.now().minusDays(1).toString();
        String weekAgo = LocalDateTime.now().minusDays(7).toString().replace('T', ' ');

        Map<String, Object> d = new LinkedHashMap<>();
        d.put("totalUsers", count("users"));
        d.put("todayNewUsers", countByDate("users", "created_at", today));
        d.put("yesterdayNewUsers", countByDate("users", "created_at", yesterday));
        d.put("totalDesigns", count("designs"));
        d.put("publicDesigns", countWhere("designs", "is_public = 1"));
        d.put("todayNewDesigns", countByDate("designs", "created_at", today));
        d.put("yesterdayNewDesigns", countByDate("designs", "created_at", yesterday));
        d.put("todayActiveUsers", queryLong(
                "SELECT COUNT(DISTINCT user_id) FROM designs WHERE CAST(updated_at AS DATE) = ?", today));
        d.put("weekActiveUsers", queryLong(
                "SELECT COUNT(DISTINCT user_id) FROM designs WHERE updated_at >= ?", weekAgo));
        d.put("brandCount", count("bead_brands"));
        d.put("colorCount", count("bead_colors"));
        d.put("bannerCount", count("banners"));
        d.put("adminCount", count("sys_admins"));
        d.put("vipUsers", countWhere("users", "is_vip = 1"));
        d.put("totalMakeSessions", count("make_sessions"));
        d.put("completedMakes", countWhere("make_sessions", "status = 'completed'"));
        d.put("inProgressMakes", countWhere("make_sessions", "status = 'in_progress'"));
        d.put("avgDuration", queryLong(
                "SELECT COALESCE(AVG(total_duration), 0) FROM make_sessions WHERE status = 'completed' AND total_duration > 0"));
        long totalMakes = count("make_sessions");
        long completed = countWhere("make_sessions", "status = 'completed'");
        d.put("makeCompletionRate", totalMakes > 0 ? (int) Math.round((double) completed / totalMakes * 100) : 0);
        d.put("todayMakes", queryLong(
                "SELECT COUNT(*) FROM make_sessions WHERE CAST(updated_at AS DATE) = ? AND status = 'completed'", today));
        return d;
    }

    @Cacheable(value = "dashboard:trends", key = "#days", unless = "#result == null")
    public Map<String, Object> getTrends(int days) {
        List<Map<String, Object>> users = new ArrayList<>();
        List<Map<String, Object>> designs = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            String date = LocalDate.now().minusDays(i).toString();
            users.add(Map.of("date", date, "count", countByDate("users", "created_at", date)));
            designs.add(Map.of("date", date, "count", countByDate("designs", "created_at", date)));
        }
        return Map.of("users", users, "designs", designs);
    }

    @Cacheable(value = "dashboard:top-designs", key = "#limit", unless = "#result == null")
    public List<Map<String, Object>> getTopDesigns(int limit) {
        return jdbc.queryForList(
                "SELECT id, title, likes_count, views_count, bead_count, color_count, thumbnail " +
                "FROM designs WHERE is_public = 1 AND status = 1 ORDER BY likes_count DESC LIMIT ?", limit);
    }

    @Cacheable(value = "dashboard:brand-distribution", unless = "#result == null")
    public List<Map<String, Object>> getBrandDistribution() {
        return jdbc.queryForList(
                "SELECT brand, COUNT(*) as count FROM designs " +
                "WHERE brand IS NOT NULL AND brand != '' GROUP BY brand ORDER BY count DESC");
    }

    public List<Map<String, Object>> getRecentLogs(int limit) {
        return jdbc.queryForList("SELECT * FROM sys_operation_logs ORDER BY created_at DESC LIMIT ?", limit);
    }

    public Map<String, Object> getContentStatusDistribution() {
        return Map.of("published", countWhere("designs", "is_public = 1"),
                      "private", countWhere("designs", "is_public = 0"));
    }

    // ---- 辅助方法（使用参数化查询，兼容 H2 和 MySQL） ----

    private long count(String table) {
        return queryLong("SELECT COUNT(*) FROM " + table);
    }

    private long countWhere(String table, String where) {
        return queryLong("SELECT COUNT(*) FROM " + table + " WHERE " + where);
    }

    private long countByDate(String table, String column, String date) {
        return queryLong("SELECT COUNT(*) FROM " + table + " WHERE CAST(" + column + " AS DATE) = ?", date);
    }

    private long queryLong(String sql, Object... params) {
        Long v = jdbc.queryForObject(sql, Long.class, params);
        return v != null ? v : 0L;
    }
}
