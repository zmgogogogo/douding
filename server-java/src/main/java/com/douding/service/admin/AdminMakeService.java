package com.douding.service.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.douding.entity.MakeSession;
import com.douding.mapper.MakeSessionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminMakeService {

    private final MakeSessionMapper sessionMapper;
    private final JdbcTemplate jdbc;

    public Map<String, Object> getMakeStats() {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("totalSessions", count("make_sessions"));
        s.put("completed", countWhere("make_sessions", "status = 'completed'"));
        s.put("inProgress", countWhere("make_sessions", "status = 'in_progress'"));
        s.put("todayCompleted", countDayWhere("make_sessions", "updated_at", "CURDATE()", "status = 'completed'"));
        s.put("todayActive", countDistinctDay("make_sessions", "user_id", "CURDATE()"));
        s.put("byMode", Map.of(
                "color", countWhere("make_sessions", "step_mode = 'color' AND status = 'completed'"),
                "region", countWhere("make_sessions", "step_mode = 'region' AND status = 'completed'"),
                "layer", countWhere("make_sessions", "step_mode = 'layer' AND status = 'completed'")
        ));
        return s;
    }

    public List<Map<String, Object>> getMakeRanking(int limit) {
        return jdbc.queryForList(
                "SELECT d.id, d.title, d.grid_width, d.grid_height, d.thumbnail, " +
                "COUNT(ms.id) as make_count, COUNT(DISTINCT ms.user_id) as maker_count " +
                "FROM designs d LEFT JOIN make_sessions ms ON d.id = ms.design_id AND ms.status = 'completed' " +
                "GROUP BY d.id HAVING make_count > 0 ORDER BY make_count DESC LIMIT ?", limit);
    }

    public Page<Map<String, Object>> listMakeRecords(int page, int limit,
                                                       Long userId, Long designId,
                                                       String startDate, String endDate) {
        StringBuilder sql = new StringBuilder(
                "SELECT ms.*, d.title as design_title, u.username, u.nickname " +
                "FROM make_sessions ms JOIN designs d ON ms.design_id = d.id " +
                "JOIN users u ON ms.user_id = u.id WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (userId != null) { sql.append(" AND ms.user_id = ?"); params.add(userId); }
        if (designId != null) { sql.append(" AND ms.design_id = ?"); params.add(designId); }
        if (startDate != null) { sql.append(" AND DATE(ms.updated_at) >= ?"); params.add(startDate); }
        if (endDate != null) { sql.append(" AND DATE(ms.updated_at) <= ?"); params.add(endDate); }

        String countSql = sql.toString().replace("ms.*, d.title", "COUNT(*)");
        long total = jdbc.queryForObject(countSql, Long.class, params.toArray());

        sql.append(" ORDER BY ms.updated_at DESC LIMIT ? OFFSET ?");
        params.add(limit);
        params.add((page - 1) * limit);

        List<Map<String, Object>> list = jdbc.queryForList(sql.toString(), params.toArray());
        Page<Map<String, Object>> result = new Page<>(page, limit);
        result.setTotal(total);
        result.setRecords(list);
        return result;
    }

    private long count(String table) { Long v = jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Long.class); return v != null ? v : 0; }
    private long countWhere(String table, String where) { Long v = jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE " + where, Long.class); return v != null ? v : 0; }
    private long countDayWhere(String table, String col, String dateFn, String extraWhere) { Long v = jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE DATE(" + col + ") = " + dateFn + " AND " + extraWhere, Long.class); return v != null ? v : 0; }
    private long countDistinctDay(String table, String col, String dateFn) { Long v = jdbc.queryForObject("SELECT COUNT(DISTINCT " + col + ") FROM " + table + " WHERE DATE(updated_at) = " + dateFn, Long.class); return v != null ? v : 0; }
}
