package com.douding.controller;

import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.security.AuthRequired;
import com.douding.security.CurrentUser;
import com.douding.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
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

        Map<String, Object> design = jdbc.queryForMap(
                "SELECT id, title, grid_data, grid_width, grid_height, bead_count, color_count FROM designs WHERE id = ?", designId);

        jdbc.update("UPDATE make_sessions SET status='completed', total_duration=?, updated_at=NOW() " +
                "WHERE user_id=? AND design_id=? AND status='in_progress'",
                body.getOrDefault("totalDuration", 0), claims.id(), designId);

        // ---- 自动扣除豆仓库存 ----
        double lossRate = body.get("lossRate") != null ? ((Number) body.get("lossRate")).doubleValue() : 5;
        Map<String, Object> deductResult = deductFromGrid(claims.id(), designId,
                (String) design.get("title"), lossRate, (String) design.get("grid_data"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("finished", true);
        result.put("designTitle", design.get("title"));
        result.put("beadCount", design.get("bead_count"));
        result.put("colorCount", design.get("color_count"));
        result.put("deduct", deductResult);
        return Result.success(result);
    }

    /** 从 grid_data 解析豆色并扣除库存 */
    private Map<String, Object> deductFromGrid(Long userId, Long designId, String designTitle,
                                                double lossRate, String gridData) {
        List<Map<String, Object>> beads = parseGridToBeads(gridData);
        if (beads.isEmpty()) return Map.of("totalDeducted", 0, "colorCount", 0, "warnings", List.of());

        double lossMultiplier = 1 + lossRate / 100;
        List<Map<String, Object>> warnings = new ArrayList<>();
        int totalDeducted = 0, totalShortage = 0;
        Set<String> affectedColors = new LinkedHashSet<>();

        for (var b : beads) {
            Long colorId = toLong(b.get("colorId"));
            int baseQty = b.get("quantity") != null ? ((Number) b.get("quantity")).intValue() : 0;
            int actualQty = (int) Math.ceil(baseQty * lossMultiplier);

            Integer before = queryForIntegerOrNull(
                    "SELECT quantity FROM user_bead_inventory WHERE user_id = ? AND color_id = ?",
                    userId, colorId);
            int beforeStock = before != null ? before : 0;
            int deducted = Math.min(beforeStock, actualQty);
            int afterStock = beforeStock - deducted;

            if (beforeStock < actualQty) {
                Map<String, Object> w = new LinkedHashMap<>();
                w.put("colorId", colorId);
                w.put("colorName", b.getOrDefault("name", ""));
                w.put("colorHex", b.getOrDefault("hex", ""));
                w.put("need", actualQty);
                w.put("available", beforeStock);
                w.put("shortage", actualQty - beforeStock);
                warnings.add(w);
                totalShortage += actualQty - beforeStock;
            }

            if (deducted > 0) {
                jdbc.update("INSERT INTO user_bead_inventory (user_id, color_id, quantity, min_threshold, updated_at) " +
                        "VALUES (?,?,?,COALESCE((SELECT min_threshold FROM user_bead_inventory WHERE user_id=? AND color_id=?),50),NOW()) " +
                        "ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()",
                        userId, colorId, afterStock, userId, colorId);

                jdbc.update("INSERT INTO inventory_logs (user_id, color_id, action, quantity, balance_after, " +
                        "source_type, source_id, source_name, note, created_at) " +
                        "VALUES (?,?,'outbound',?,?,'deduct',?,?,?,NOW())",
                        userId, colorId, -deducted, afterStock, designId, designTitle,
                        "制作消耗 · 损耗率" + lossRate + "%");

                jdbc.update("INSERT INTO design_bead_usage (user_id, design_id, color_id, quantity) " +
                        "VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)",
                        userId, designId, colorId, deducted);

                affectedColors.add(String.valueOf(colorId));
                totalDeducted += deducted;
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalDeducted", totalDeducted);
        result.put("totalShortage", totalShortage);
        result.put("colorCount", affectedColors.size());
        result.put("lossRate", lossRate);
        result.put("warnings", warnings);
        return result;
    }

    /** 解析 grid_data JSON 为颜色统计列表 [{colorId, hex, name, quantity}, ...] */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseGridToBeads(String gridData) {
        if (gridData == null || gridData.isBlank()) return List.of();
        try {
            ObjectMapper mapper = new ObjectMapper();
            List<List<Map<String, Object>>> grid = mapper.readValue(gridData, List.class);
            Map<String, Map<String, Object>> colorMap = new LinkedHashMap<>();
            for (var row : grid) {
                if (row == null) continue;
                for (var cell : row) {
                    if (cell != null && cell.get("hex") != null) {
                        String hex = ((String) cell.get("hex")).toUpperCase();
                        colorMap.computeIfAbsent(hex, k -> {
                            Map<String, Object> m = new LinkedHashMap<>();
                            m.put("hex", hex);
                            m.put("name", cell.getOrDefault("name", "?"));
                            m.put("quantity", 0);
                            return m;
                        });
                        colorMap.get(hex).put("quantity",
                                ((Number) colorMap.get(hex).get("quantity")).intValue() + 1);
                    }
                }
            }
            // 映射 hex → color_id
            for (var entry : colorMap.entrySet()) {
                Map<String, Object> bc = queryForMapOrNull(
                        "SELECT id FROM bead_colors WHERE UPPER(hex) = ? LIMIT 1", entry.getKey());
                if (bc != null) entry.getValue().put("colorId", bc.get("id"));
            }
            return new ArrayList<>(colorMap.values());
        } catch (Exception e) {
            return List.of();
        }
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

    private Integer queryForIntegerOrNull(String sql, Object... params) {
        try { return jdbc.queryForObject(sql, Integer.class, params); } catch (Exception e) { return null; }
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
