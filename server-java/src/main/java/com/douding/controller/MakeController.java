package com.douding.controller;

import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.security.AuthRequired;
import com.douding.security.CurrentUser;
import com.douding.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/** 制作模式控制器 — 替代 routes/make.js */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MakeController {

    private final JdbcTemplate jdbc;

    @GetMapping("/make/progress/{designId}")
    @AuthRequired
    public Result<Map<String, Object>> getProgress(@PathVariable Long designId,
                                                     @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Map<String, Object> session = queryForMapOrNull(
                "SELECT * FROM make_sessions WHERE user_id = ? AND design_id = ? AND status = 'in_progress' " +
                "ORDER BY updated_at DESC LIMIT 1", claims.id(), designId);
        if (session == null) return Result.success(null);

        return Result.success(Map.of(
                "id", session.get("id"), "currentStep", session.get("current_step"),
                "finishedSteps", parseJsonArray((String) session.get("finished_steps")),
                "stepMode", session.get("step_mode"), "totalDuration", session.get("total_duration"),
                "archiveName", session.get("archive_name"), "updatedAt", session.get("updated_at")));
    }

    @PostMapping("/make/progress/save")
    @AuthRequired
    public Result<Map<String, Object>> saveProgress(@RequestBody Map<String, Object> body,
                                                      @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Long designId = toLong(body.get("designId"));
        if (designId == null) throw AppException.badRequest("缺少图纸 ID");

        int currentStep = body.get("currentStep") != null ? ((Number) body.get("currentStep")).intValue() : 0;
        String finishedSteps = toJson(body.getOrDefault("finishedSteps", List.of()));
        String stepMode = (String) body.getOrDefault("stepMode", "color");
        int totalDuration = body.get("totalDuration") != null ? ((Number) body.get("totalDuration")).intValue() : 0;
        String archiveName = (String) body.getOrDefault("archiveName", "默认存档");

        Map<String, Object> existing = queryForMapOrNull(
                "SELECT id FROM make_sessions WHERE user_id = ? AND design_id = ? AND status = 'in_progress' LIMIT 1",
                claims.id(), designId);

        if (existing != null) {
            jdbc.update("UPDATE make_sessions SET current_step=?, finished_steps=?, step_mode=?, " +
                    "total_duration=?, archive_name=?, updated_at=NOW() WHERE id=?",
                    currentStep, finishedSteps, stepMode, totalDuration, archiveName, existing.get("id"));
        } else {
            jdbc.update("INSERT INTO make_sessions (user_id, design_id, current_step, finished_steps, step_mode, total_duration, archive_name) " +
                    "VALUES (?,?,?,?,?,?,?)", claims.id(), designId, currentStep, finishedSteps, stepMode, totalDuration, archiveName);
        }
        return Result.success(Map.of("saved", true));
    }

    @PostMapping("/make/progress/finish")
    @AuthRequired
    @Transactional
    public Result<Map<String, Object>> finishProgress(@RequestBody Map<String, Object> body,
                                                        @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Long designId = toLong(body.get("designId"));
        if (designId == null) throw AppException.badRequest("缺少图纸 ID");

        Map<String, Object> design = jdbc.queryForMap("SELECT * FROM designs WHERE id = ?", designId);

        jdbc.update("UPDATE make_sessions SET status='completed', total_duration=?, updated_at=NOW() " +
                "WHERE user_id=? AND design_id=? AND status='in_progress'",
                body.getOrDefault("totalDuration", 0), claims.id(), designId);

        return Result.success(Map.of("finished", true, "designTitle", design.get("title"),
                "beadCount", design.get("bead_count"), "colorCount", design.get("color_count")));
    }

    @GetMapping("/make/records")
    @AuthRequired
    public Result<Result.PageData<Map<String, Object>>> records(
            @CurrentUser JwtTokenProvider.TokenClaims claims,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {

        int offset = (Math.max(1, page) - 1) * limit;
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT ms.*, d.title as design_title, d.grid_width, d.grid_height, d.bead_count, d.color_count, d.thumbnail " +
                "FROM make_sessions ms JOIN designs d ON ms.design_id = d.id " +
                "WHERE ms.user_id = ? AND ms.status = 'completed' ORDER BY ms.updated_at DESC LIMIT ? OFFSET ?",
                claims.id(), limit, offset);
        Long total = jdbc.queryForObject(
                "SELECT COUNT(*) FROM make_sessions WHERE user_id = ? AND status = 'completed'", Long.class, claims.id());

        return Result.paginated(rows, total != null ? total : 0, page, limit);
    }

    @GetMapping("/make/stats/summary")
    @AuthRequired
    public Result<Map<String, Object>> statsSummary(@CurrentUser JwtTokenProvider.TokenClaims claims) {
        Map<String, Object> summary = jdbc.queryForMap(
                "SELECT COUNT(*) as totalMakes, COALESCE(SUM(total_duration),0) as totalDuration " +
                "FROM make_sessions WHERE user_id = ? AND status = 'completed'", claims.id());

        Map<String, Object> distinct = jdbc.queryForMap(
                "SELECT COUNT(DISTINCT design_id) as totalDesigns FROM make_sessions WHERE user_id = ? AND status = 'completed'",
                claims.id());

        return Result.success(Map.of(
                "totalMakes", summary.get("totalMakes"), "totalDesigns", distinct.get("totalDesigns"),
                "totalDuration", summary.get("totalDuration"), "totalBeads", 0, "currentStreak", 0));
    }

    @GetMapping("/make/settings")
    @AuthRequired
    public Result<Map<String, Object>> getSettings(@CurrentUser JwtTokenProvider.TokenClaims claims) {
        Map<String, Object> row = queryForMapOrNull("SELECT * FROM user_make_settings WHERE user_id = ?", claims.id());
        if (row == null) return Result.success(null);
        return Result.success(Map.of(
                "displaySettings", parseJsonObject((String) row.get("display_settings")),
                "operationSettings", parseJsonObject((String) row.get("operation_settings")),
                "theme", row.getOrDefault("theme", "dark")));
    }

    @PostMapping("/make/settings/save")
    @AuthRequired
    public Result<Map<String, Object>> saveSettings(@RequestBody Map<String, Object> body,
                                                      @CurrentUser JwtTokenProvider.TokenClaims claims) {
        String displaySettings = toJson(body.getOrDefault("displaySettings", Map.of()));
        String operationSettings = toJson(body.getOrDefault("operationSettings", Map.of()));
        String theme = (String) body.getOrDefault("theme", "dark");

        Map<String, Object> ex = queryForMapOrNull("SELECT id FROM user_make_settings WHERE user_id = ?", claims.id());
        if (ex != null) {
            jdbc.update("UPDATE user_make_settings SET display_settings=?, operation_settings=?, theme=?, updated_at=NOW() WHERE user_id=?",
                    displaySettings, operationSettings, theme, claims.id());
        } else {
            jdbc.update("INSERT INTO user_make_settings (user_id, display_settings, operation_settings, theme) VALUES (?,?,?,?)",
                    claims.id(), displaySettings, operationSettings, theme);
        }
        return Result.success(Map.of("saved", true));
    }

    // ===== 工具 =====

    private Long toLong(Object v) {
        if (v instanceof Number n) return n.longValue();
        if (v instanceof String s) { try { return Long.parseLong(s); } catch (Exception e) {} }
        return null;
    }

    private Map<String, Object> queryForMapOrNull(String sql, Object... params) {
        try { return jdbc.queryForMap(sql, params); } catch (Exception e) { return null; }
    }

    private String toJson(Object obj) {
        try { return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(obj); }
        catch (Exception e) { return "[]"; }
    }

    @SuppressWarnings("unchecked")
    private List<Object> parseJsonArray(String json) {
        try { return new com.fasterxml.jackson.databind.ObjectMapper().readValue(json, List.class); }
        catch (Exception e) { return List.of(); }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJsonObject(String json) {
        try { return new com.fasterxml.jackson.databind.ObjectMapper().readValue(json, Map.class); }
        catch (Exception e) { return Map.of(); }
    }
}
