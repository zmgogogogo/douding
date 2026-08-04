package com.douding.controller;

import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.security.AuthRequired;
import com.douding.security.CurrentUser;
import com.douding.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * 豆仓系统 V3.0 控制器 — 替代 routes/stock.js + routes/inventory.js
 * 约 30 个 API 端点
 */
@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class StockController {

    private final JdbcTemplate jdbc;

    // ====== 库存列表与概览 ======

    /** 获取用户所有颜色库存（含未拥有） */
    @GetMapping("/stock/list")
    @AuthRequired
    public Result<Map<String, Object>> stockList(@CurrentUser JwtTokenProvider.TokenClaims claims,
                                                   @RequestParam(required = false) String status) {
        Long userId = claims.id();
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT c.id as colorId, c.name as colorName, c.hex as colorHex, " +
                "COALESCE(c.color_type,1) as type, c.sort_order as sortOrder, " +
                "b.name as brand, s.name as series, " +
                "COALESCE(i.quantity, -1) as stockNum, COALESCE(i.min_threshold, 50) as warnNum " +
                "FROM bead_colors c JOIN bead_series s ON c.series_id = s.id " +
                "JOIN bead_brands b ON s.brand_id = b.id " +
                "LEFT JOIN user_bead_inventory i ON c.id = i.color_id AND i.user_id = ? " +
                "ORDER BY b.name, c.sort_order", userId);

        List<Map<String, Object>> items = rows.stream().map(r -> {
            int stockNum = ((Number) r.get("stockNum")).intValue();
            int warnNum = ((Number) r.get("warnNum")).intValue();
            String computedStatus = stockNum == -1 ? "unowned" : stockNum == 0 ? "out"
                    : stockNum <= warnNum ? "low" : "sufficient";
            Map<String, Object> item = new LinkedHashMap<>(r);
            item.put("status", computedStatus);
            item.put("isNewRecord", stockNum == -1);
            return item;
        }).collect(Collectors.toList());

        if (status != null && !"all".equals(status)) {
            items = items.stream().filter(i -> status.equals(i.get("status"))).collect(Collectors.toList());
        }

        int totalBeads = items.stream().filter(i -> ((Number) i.get("stockNum")).intValue() > 0)
                .mapToInt(i -> ((Number) i.get("stockNum")).intValue()).sum();
        long ownedColors = items.stream().filter(i -> ((Number) i.get("stockNum")).intValue() > 0).count();
        long outOfStock = items.stream().filter(i -> "out".equals(i.get("status"))).count();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("items", items);
        data.put("overview", Map.of("totalBeads", totalBeads, "ownedColors", ownedColors,
                "outOfStock", outOfStock, "totalColors", items.size()));
        return Result.success(data);
    }

    @GetMapping("/stock/overview")
    @AuthRequired
    public Result<Map<String, Object>> overview(@CurrentUser JwtTokenProvider.TokenClaims claims) {
        Long userId = claims.id();
        Map<String, Object> stats = jdbc.queryForMap(
                "SELECT COALESCE(SUM(i.quantity),0) as totalBeads, " +
                "COUNT(DISTINCT CASE WHEN i.quantity > 0 THEN i.color_id END) as ownedColors, " +
                "COUNT(DISTINCT CASE WHEN i.quantity = 0 THEN i.color_id END) as outOfStock " +
                "FROM bead_colors c LEFT JOIN user_bead_inventory i ON c.id = i.color_id AND i.user_id = ?", userId);
        Long totalColors = jdbc.queryForObject("SELECT COUNT(*) FROM bead_colors", Long.class);
        Long hasRecord = jdbc.queryForObject(
                "SELECT COUNT(*) FROM user_bead_inventory WHERE user_id = ?", Long.class, userId);

        Map<String, Object> data = new LinkedHashMap<>(stats);
        data.put("unowned", totalColors - (hasRecord != null ? hasRecord : 0));
        return Result.success(data);
    }

    // ====== 库存修改 ======

    @PostMapping("/stock/update")
    @AuthRequired
    @Transactional
    public Result<Map<String, Object>> update(@RequestBody Map<String, Object> body,
                                                @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Long colorId = toLong(body.get("colorId"));
        Integer delta = body.get("delta") != null ? ((Number) body.get("delta")).intValue() : null;
        if (colorId == null || delta == null) throw AppException.badRequest("缺少参数");

        Long userId = claims.id();
        Integer before = jdbc.queryForObject(
                "SELECT quantity FROM user_bead_inventory WHERE user_id = ? AND color_id = ?",
                Integer.class, userId, colorId);
        int beforeStock = before != null ? before : 0;
        int afterStock = Math.max(0, beforeStock + delta);

        jdbc.update("INSERT INTO user_bead_inventory (user_id, color_id, quantity, min_threshold, updated_at) " +
                "VALUES (?,?,?, COALESCE((SELECT min_threshold FROM user_bead_inventory WHERE user_id=? AND color_id=?),50), NOW()) " +
                "ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()",
                userId, colorId, afterStock, userId, colorId);

        jdbc.update("INSERT INTO inventory_logs (user_id, color_id, action, quantity, balance_after, source_type, created_at) " +
                "VALUES (?,?,?,?,?,'manual',NOW())",
                userId, colorId, delta >= 0 ? "inbound" : "outbound", delta, afterStock);

        Map<String, Object> color = jdbc.queryForMap("SELECT name, hex FROM bead_colors WHERE id = ?", colorId);
        return Result.success(Map.of("colorId", colorId, "beforeStock", beforeStock, "afterStock", afterStock,
                "delta", delta, "stockNum", afterStock, "status", afterStock == 0 ? "out" : "sufficient"),
                (delta >= 0 ? "入库 " : "出库 ") + Math.abs(delta) + " 颗");
    }

    @PostMapping("/stock/batch-add")
    @AuthRequired
    @Transactional
    public Result<Map<String, Object>> batchAdd(@RequestBody Map<String, Object> body,
                                                  @CurrentUser JwtTokenProvider.TokenClaims claims) {
        List<Map<String, Object>> items = castList(body.get("items"));
        if (items == null || items.isEmpty()) throw AppException.badRequest("缺少批量数据");

        Long userId = claims.id();
        int success = 0, failed = 0;
        for (var item : items) {
            Long colorId = toLong(item.get("colorId"));
            Integer num = item.get("num") != null ? ((Number) item.get("num")).intValue() : null;
            if (colorId == null || num == null || num <= 0) { failed++; continue; }

            Integer before = jdbc.queryForObject(
                    "SELECT quantity FROM user_bead_inventory WHERE user_id = ? AND color_id = ?",
                    Integer.class, userId, colorId);
            int after = (before != null ? before : 0) + num;

            jdbc.update("INSERT INTO user_bead_inventory (user_id, color_id, quantity, min_threshold, updated_at) " +
                    "VALUES (?,?,?,COALESCE((SELECT min_threshold FROM user_bead_inventory WHERE user_id=? AND color_id=?),50),NOW()) " +
                    "ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()",
                    userId, colorId, after, userId, colorId);
            jdbc.update("INSERT INTO inventory_logs (user_id, color_id, action, quantity, balance_after, source_type, created_at) " +
                    "VALUES (?,?,'inbound',?,?,'batch_in',NOW())", userId, colorId, num, after);
            success++;
        }
        return Result.success(Map.of("success", success, "failed", failed),
                "批量入库完成：" + success + "成功" + (failed > 0 ? "，" + failed + "失败" : ""));
    }

    @PostMapping("/stock/warn-set")
    @AuthRequired
    public Result<Map<String, Object>> warnSet(@RequestBody Map<String, Object> body,
                                                @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Long colorId = toLong(body.get("colorId"));
        Integer warnNum = body.get("warnNum") != null ? ((Number) body.get("warnNum")).intValue() : null;
        if (colorId == null || warnNum == null) throw AppException.badRequest("缺少参数");

        Long userId = claims.id();
        jdbc.update("INSERT INTO user_bead_inventory (user_id, color_id, quantity, min_threshold, updated_at) " +
                "VALUES (?,?,COALESCE((SELECT quantity FROM user_bead_inventory WHERE user_id=? AND color_id=?),0),?,NOW()) " +
                "ON DUPLICATE KEY UPDATE min_threshold = VALUES(min_threshold), updated_at = NOW()",
                userId, colorId, userId, colorId, Math.max(0, warnNum));

        Map<String, Object> color = jdbc.queryForMap("SELECT name FROM bead_colors WHERE id = ?", colorId);
        return Result.success(Map.of("colorId", colorId, "warnNum", warnNum),
                (color.get("name")) + " 预警值已设为 " + warnNum);
    }

    // ====== 缺料清单 ======

    @GetMapping("/stock/lack-list")
    @AuthRequired
    public Result<Map<String, Object>> lackList(@CurrentUser JwtTokenProvider.TokenClaims claims) {
        Long userId = claims.id();
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT i.color_id as colorId, i.quantity as stockNum, i.min_threshold as warnNum, " +
                "c.name as colorName, c.hex as colorHex, b.name as brand, s.name as series " +
                "FROM user_bead_inventory i JOIN bead_colors c ON i.color_id = c.id " +
                "JOIN bead_series s ON c.series_id = s.id JOIN bead_brands b ON s.brand_id = b.id " +
                "WHERE i.user_id = ? AND i.quantity <= i.min_threshold ORDER BY i.quantity ASC", userId);

        List<Map<String, Object>> list = rows.stream().map(r -> {
            int stockNum = ((Number) r.get("stockNum")).intValue();
            int warnNum = ((Number) r.get("warnNum")).intValue();
            int suggestNum = stockNum == 0 ? 100 : warnNum - stockNum;
            Map<String, Object> m = new LinkedHashMap<>(r);
            m.put("status", stockNum == 0 ? "out" : "low");
            m.put("suggestNum", suggestNum);
            return m;
        }).collect(Collectors.toList());

        int totalShortage = list.stream().mapToInt(i -> ((Number) i.get("suggestNum")).intValue()).sum();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("items", list);
        data.put("total", list.size());
        data.put("outCount", list.stream().filter(i -> "out".equals(i.get("status"))).count());
        data.put("lowCount", list.stream().filter(i -> "low".equals(i.get("status"))).count());
        data.put("totalShortage", totalShortage);
        return Result.success(data);
    }

    // ====== 库存流水 ======

    @GetMapping("/stock/log/list")
    @AuthRequired
    public Result<Map<String, Object>> logList(
            @CurrentUser JwtTokenProvider.TokenClaims claims,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) Long colorId) {

        Long userId = claims.id();
        int offset = (Math.max(1, page) - 1) * limit;
        StringBuilder where = new StringBuilder("WHERE l.user_id = ?");
        List<Object> params = new ArrayList<>();
        params.add(userId);

        if (colorId != null) {
            where.append(" AND l.color_id = ?");
            params.add(colorId);
        }

        List<Map<String, Object>> logs = jdbc.queryForList(
                "SELECT l.*, c.name as colorName, c.hex as colorHex FROM inventory_logs l " +
                "JOIN bead_colors c ON l.color_id = c.id " + where +
                " ORDER BY l.created_at DESC LIMIT ? OFFSET ?",
                Stream.concat(params.stream(), Stream.of(limit, offset)).toArray());

        Object[] countParams = params.toArray();
        Long total = jdbc.queryForObject(
                "SELECT COUNT(*) FROM inventory_logs l " + where, Long.class, countParams);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("items", logs);
        data.put("total", total);
        data.put("page", page);
        data.put("limit", limit);
        data.put("totalPages", (int) Math.ceil((total != null ? total : 0) * 1.0 / limit));
        return Result.success(data);
    }

    // ====== 制作扣料 ======

    @PostMapping("/stock/deduct")
    @AuthRequired
    @Transactional
    public Result<Map<String, Object>> deduct(@RequestBody Map<String, Object> body,
                                                @CurrentUser JwtTokenProvider.TokenClaims claims) {
        List<Map<String, Object>> beads = castList(body.get("beads"));
        if (beads == null || beads.isEmpty()) throw AppException.badRequest("缺少消耗列表");

        Long userId = claims.id();
        Long designId = toLong(body.get("designId"));
        String designTitle = (String) body.getOrDefault("designTitle", "");
        double lossRate = body.get("lossRate") != null ? ((Number) body.get("lossRate")).doubleValue() : 5;
        int copies = Math.max(1, body.get("copies") != null ? ((Number) body.get("copies")).intValue() : 1);
        double lossMultiplier = 1 + lossRate / 100;

        List<Map<String, Object>> warnings = new ArrayList<>();
        int totalDeducted = 0, totalShortage = 0;

        for (var b : beads) {
            Long colorId = toLong(b.get("colorId"));
            int baseQty = b.get("quantity") != null ? ((Number) b.get("quantity")).intValue() : 0;
            int actualQty = (int) Math.ceil(baseQty * copies * lossMultiplier);

            Integer before = jdbc.queryForObject(
                    "SELECT quantity FROM user_bead_inventory WHERE user_id = ? AND color_id = ?",
                    Integer.class, userId, colorId);
            int beforeStock = before != null ? before : 0;
            int deducted = Math.min(beforeStock, actualQty);
            int afterStock = beforeStock - deducted;

            if (beforeStock < actualQty) {
                warnings.add(Map.of("colorId", colorId, "colorName", b.getOrDefault("name", ""),
                        "colorHex", b.getOrDefault("hex", ""), "need", actualQty,
                        "available", beforeStock, "shortage", actualQty - beforeStock));
                totalShortage += actualQty - beforeStock;
            }

            jdbc.update("INSERT INTO user_bead_inventory (user_id, color_id, quantity, min_threshold, updated_at) " +
                    "VALUES (?,?,?,COALESCE((SELECT min_threshold FROM user_bead_inventory WHERE user_id=? AND color_id=?),50),NOW()) " +
                    "ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()",
                    userId, colorId, afterStock, userId, colorId);

            jdbc.update("INSERT INTO inventory_logs (user_id, color_id, action, quantity, balance_after, source_type, source_id, source_name, note, created_at) " +
                    "VALUES (?,?,'outbound',?,?,'deduct',?,?,?,NOW())",
                    userId, colorId, -deducted, afterStock, designId, designTitle,
                    "制作消耗" + copies + "份，损耗率" + lossRate + "%");

            if (designId != null) {
                jdbc.update("INSERT INTO design_bead_usage (user_id, design_id, color_id, quantity) VALUES (?,?,?,?)",
                        userId, designId, colorId, deducted);
            }
            totalDeducted += deducted;
        }

        return Result.success(Map.of("totalDeducted", totalDeducted, "totalShortage", totalShortage,
                "warnings", warnings, "copies", copies, "lossRate", lossRate));
    }

    // ====== 作品库存检测 ======

    @PostMapping("/stock/check-work")
    @AuthRequired
    public Result<Map<String, Object>> checkWork(@RequestBody Map<String, Object> body,
                                                   @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Long workId = toLong(body.get("workId"));
        if (workId == null) throw AppException.badRequest("缺少作品 ID");

        Long userId = claims.id();
        List<Map<String, Object>> usages = jdbc.queryForList(
                "SELECT du.color_id, du.quantity, bc.name, bc.hex FROM design_bead_usage du " +
                "LEFT JOIN bead_colors bc ON du.color_id = bc.id WHERE du.design_id = ?", workId);

        // 若为空，从 grid_data 解析
        if (usages.isEmpty()) {
            String gridData = jdbc.queryForObject("SELECT grid_data FROM designs WHERE id = ?", String.class, workId);
            usages = parseGridUsage(gridData);
        }

        List<Map<String, Object>> items = new ArrayList<>();
        int totalNeed = 0, totalLack = 0;
        for (var u : usages) {
            int need = ((Number) u.get("quantity")).intValue();
            Long cid = toLong(u.get("color_id"));
            int stock = 0;
            if (cid != null) {
                Integer s = jdbc.queryForObject(
                        "SELECT quantity FROM user_bead_inventory WHERE user_id = ? AND color_id = ?",
                        Integer.class, userId, cid);
                stock = s != null ? s : 0;
            }
            int lack = Math.max(0, need - stock);
            totalNeed += need;
            totalLack += lack;
            items.add(Map.of("colorCode", u.getOrDefault("name", "?"),
                    "colorHex", u.getOrDefault("hex", "#ccc"), "needNum", need,
                    "stockNum", stock, "lackNum", lack, "sufficient", lack == 0));
        }

        return Result.success(Map.of("items", items, "totalNeed", totalNeed,
                "totalLack", totalLack, "allSufficient", totalLack == 0));
    }

    // ====== 用户设置 ======

    @GetMapping("/stock/settings")
    @AuthRequired
    public Result<Map<String, Object>> getSettings(@CurrentUser JwtTokenProvider.TokenClaims claims) {
        Map<String, Object> row = queryForMapOrNull(
                "SELECT * FROM user_stock_settings WHERE user_id = ?", claims.id());
        if (row == null) {
            jdbc.update("INSERT INTO user_stock_settings (user_id, auto_deduct, default_loss_rate) VALUES (?,1,5.0)", claims.id());
            row = Map.of("auto_deduct", 1, "default_loss_rate", 5.0);
        }
        return Result.success(Map.of("autoDeduct", !"0".equals(String.valueOf(row.get("auto_deduct"))),
                "lossRate", row.get("default_loss_rate")));
    }

    @PostMapping("/stock/settings")
    @AuthRequired
    public Result<Map<String, Object>> saveSettings(@RequestBody Map<String, Object> body,
                                                      @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Boolean autoDeduct = body.get("autoDeduct") instanceof Boolean b ? b : null;
        Double lossRate = body.get("lossRate") != null ? ((Number) body.get("lossRate")).doubleValue() : null;
        jdbc.update("INSERT INTO user_stock_settings (user_id, auto_deduct, default_loss_rate, updated_at) VALUES (?,?,?,NOW()) " +
                "ON DUPLICATE KEY UPDATE auto_deduct = COALESCE(VALUES(auto_deduct), auto_deduct), " +
                "default_loss_rate = COALESCE(VALUES(default_loss_rate), default_loss_rate), updated_at = NOW()",
                claims.id(), autoDeduct != null ? (autoDeduct ? 1 : 0) : null, lossRate);
        return Result.success(Map.of("autoDeduct", autoDeduct, "lossRate", lossRate), "设置已保存");
    }

    // ====== 采购建议/替代色/多图纸匹配 (精简版，保留核心) ======

    @GetMapping("/inventory/purchase-suggest")
    @AuthRequired
    public Result<Map<String, Object>> purchaseSuggest(@CurrentUser JwtTokenProvider.TokenClaims claims) {
        Long userId = claims.id();
        List<Map<String, Object>> lowStock = jdbc.queryForList(
                "SELECT i.color_id, i.quantity, i.min_threshold, c.name, c.hex " +
                "FROM user_bead_inventory i JOIN bead_colors c ON i.color_id = c.id " +
                "WHERE i.user_id = ? AND i.min_threshold > 0 AND i.quantity <= i.min_threshold ORDER BY i.quantity ASC",
                userId);
        return Result.success(Map.of("lowStock", lowStock));
    }

    @GetMapping("/inventory/substitute/{colorId}")
    @AuthRequired
    public Result<Map<String, Object>> substitute(@PathVariable Long colorId,
                                                    @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Map<String, Object> target = jdbc.queryForMap(
                "SELECT id, name, hex, lab_l, lab_a, lab_b FROM bead_colors WHERE id = ?", colorId);
        if (target == null || target.get("lab_l") == null) throw AppException.notFound("颜色不存在或缺少LAB值");

        Long userId = claims.id();
        List<Map<String, Object>> candidates = jdbc.queryForList(
                "SELECT c.id, c.name, c.hex, c.lab_l, c.lab_a, c.lab_b, s.name as series, b.name as brand, " +
                "COALESCE(i.quantity,0) as quantity FROM bead_colors c " +
                "JOIN bead_series s ON c.series_id = s.id JOIN bead_brands b ON s.brand_id = b.id " +
                "LEFT JOIN user_bead_inventory i ON i.color_id = c.id AND i.user_id = ? WHERE c.id != ?",
                userId, colorId);

        double targetL = ((Number) target.get("lab_l")).doubleValue();
        double targetA = ((Number) target.get("lab_a")).doubleValue();
        double targetB = ((Number) target.get("lab_b")).doubleValue();

        List<Map<String, Object>> substitutes = candidates.stream().map(c -> {
            double dL = targetL - ((Number) c.get("lab_l")).doubleValue();
            double dA = targetA - ((Number) c.get("lab_a")).doubleValue();
            double dB = targetB - ((Number) c.get("lab_b")).doubleValue();
            double dist = Math.sqrt(dL * dL + dA * dA + dB * dB); // 简化欧氏距离
            return Map.<String, Object>of(
                    "color", Map.of("id", c.get("id"), "name", c.get("name"), "hex", c.get("hex"),
                            "brand", c.get("brand"), "series", c.get("series")),
                    "deltaE", Math.round(dist * 100) / 100.0,
                    "inStock", c.get("quantity"),
                    "grade", dist < 3 ? "excellent" : dist < 5 ? "good" : dist < 10 ? "acceptable" : "poor");
        }).filter(s -> ((Number) s.get("deltaE")).doubleValue() < 10)
                .sorted(Comparator.comparingDouble(s -> ((Number) s.get("deltaE")).doubleValue()))
                .limit(10).collect(Collectors.toList());

        return Result.success(Map.of("source", Map.of("colorId", target.get("id"),
                "name", target.get("name"), "hex", target.get("hex")), "substitutes", substitutes));
    }

    // ====== 工具方法 ======

    private Long toLong(Object v) {
        if (v instanceof Number n) return n.longValue();
        if (v instanceof String s) { try { return Long.parseLong(s); } catch (Exception e) {} }
        return null;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> castList(Object obj) {
        if (obj instanceof List) return (List<Map<String, Object>>) obj;
        return null;
    }

    private Map<String, Object> queryForMapOrNull(String sql, Object... params) {
        try { return jdbc.queryForMap(sql, params); } catch (Exception e) { return null; }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseGridUsage(String gridData) {
        if (gridData == null) return List.of();
        try {
            List<List<Map<String, Object>>> grid = new com.fasterxml.jackson.databind.ObjectMapper().readValue(gridData, List.class);
            Map<String, Map<String, Object>> colorMap = new LinkedHashMap<>();
            for (var row : grid) {
                if (row == null) continue;
                for (var cell : row) {
                    if (cell != null && cell.get("hex") != null) {
                        String hex = cell.get("hex").toString().toUpperCase();
                        colorMap.computeIfAbsent(hex, k -> {
                            Map<String, Object> m = new LinkedHashMap<>();
                            m.put("name", cell.getOrDefault("name", "?"));
                            m.put("hex", hex);
                            m.put("quantity", 0);
                            return m;
                        });
                        colorMap.get(hex).put("quantity", ((Number) colorMap.get(hex).get("quantity")).intValue() + 1);
                    }
                }
            }
            for (var entry : colorMap.entrySet()) {
                String hex = entry.getKey();
                Map<String, Object> bc = queryForMapOrNull("SELECT id FROM bead_colors WHERE UPPER(hex) = ? LIMIT 1", hex);
                if (bc != null) entry.getValue().put("color_id", bc.get("id"));
            }
            return new ArrayList<>(colorMap.values());
        } catch (Exception e) { return List.of(); }
    }
}
