package com.douding.controller;

import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.security.AuthRequired;
import com.douding.security.CurrentUser;
import com.douding.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** 导出控制器 — 替代 routes/export.js */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ExportController {

    private final JdbcTemplate jdbc;

    /** 兼容旧接口：编辑器内免权限导出 */
    @PostMapping("/export/grid")
    public void exportGrid(@RequestBody Map<String, Object> body, HttpServletResponse response) {
        // 简化实现：返回占位响应（完整实现需调用 Sharp 等价逻辑）
        response.setContentType("image/png");
        response.setHeader("Content-Disposition", "attachment; filename=\"bead_pattern.png\"");
        try {
            response.getOutputStream().write(new byte[0]);
        } catch (Exception ignored) {}
    }

    @PostMapping("/export/png/{id}")
    @AuthRequired
    public void exportPng(@PathVariable Long id, @RequestBody Map<String, Object> body,
                           @CurrentUser JwtTokenProvider.TokenClaims claims,
                           HttpServletResponse response) {
        checkExportPermission(id, claims.id());
        logDownload(claims.id(), id, "png");
        // TODO: 集成高清图片导出服务
        setAttachmentHeader(response, "pattern_" + id + ".png", "image/png");
    }

    @PostMapping("/export/pdf/{id}")
    @AuthRequired
    public void exportPdf(@PathVariable Long id, @RequestBody Map<String, Object> body,
                           @CurrentUser JwtTokenProvider.TokenClaims claims,
                           HttpServletResponse response) {
        checkExportPermission(id, claims.id());
        logDownload(claims.id(), id, "pdf");
        setAttachmentHeader(response, "pattern_" + id + ".pdf", "application/pdf");
    }

    @PostMapping("/export/svg/{id}")
    @AuthRequired
    public void exportSvg(@PathVariable Long id, @RequestBody Map<String, Object> body,
                           @CurrentUser JwtTokenProvider.TokenClaims claims,
                           HttpServletResponse response) {
        checkExportPermission(id, claims.id());
        logDownload(claims.id(), id, "svg");
        setAttachmentHeader(response, "pattern_" + id + ".svg", "image/svg+xml");
    }

    @PostMapping("/export/json/{id}")
    @AuthRequired
    public Result<Map<String, Object>> exportJson(@PathVariable Long id,
                                                    @CurrentUser JwtTokenProvider.TokenClaims claims) {
        checkExportPermission(id, claims.id());
        logDownload(claims.id(), id, "json");
        Map<String, Object> design = jdbc.queryForMap("SELECT * FROM designs WHERE id = ?", id);
        return Result.success(design);
    }

    @PostMapping("/export/csv/{id}")
    @AuthRequired
    public void exportCsv(@PathVariable Long id, @RequestBody Map<String, Object> body,
                           @CurrentUser JwtTokenProvider.TokenClaims claims,
                           HttpServletResponse response) {
        checkExportPermission(id, claims.id());
        logDownload(claims.id(), id, "csv");
        setAttachmentHeader(response, "material_" + id + ".csv", "text/csv; charset=utf-8");
    }

    @PostMapping("/export/zip/{id}")
    @AuthRequired
    public void exportZip(@PathVariable Long id, @RequestBody Map<String, Object> body,
                           @CurrentUser JwtTokenProvider.TokenClaims claims,
                           HttpServletResponse response) {
        checkExportPermission(id, claims.id());
        logDownload(claims.id(), id, "zip");
        setAttachmentHeader(response, "all_" + id + ".zip", "application/zip");
    }

    @GetMapping("/export/downloads")
    @AuthRequired
    public Result<Map<String, Object>> downloads(@CurrentUser JwtTokenProvider.TokenClaims claims,
                                                   @RequestParam(defaultValue = "1") int page,
                                                   @RequestParam(defaultValue = "20") int limit) {
        int offset = (Math.max(1, page) - 1) * limit;
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT dl.*, d.title, d.grid_width, d.grid_height FROM download_logs dl " +
                "JOIN designs d ON dl.design_id = d.id WHERE dl.user_id = ? " +
                "ORDER BY dl.created_at DESC LIMIT ? OFFSET ?", claims.id(), limit, offset);
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM download_logs WHERE user_id = ?", Long.class, claims.id());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("list", rows);
        data.put("total", total);
        data.put("page", page);
        data.put("hasMore", offset + rows.size() < (total != null ? total : 0));
        return Result.success(data);
    }

    private void checkExportPermission(Long designId, Long userId) {
        Map<String, Object> design = jdbc.queryForMap("SELECT * FROM designs WHERE id = ?", designId);
        if (design == null || !"1".equals(String.valueOf(design.get("status"))))
            throw AppException.notFound("作品不存在或已下架");

        Long ownerId = ((Number) design.get("user_id")).longValue();
        if (!userId.equals(ownerId)) {
            Long liked = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM design_likes WHERE user_id = ? AND design_id = ?", Long.class, userId, designId);
            if (liked == null || liked == 0) throw AppException.forbidden("请先点赞该作品后再下载图纸");
        }
    }

    private void logDownload(Long userId, Long designId, String format) {
        try {
            jdbc.update("INSERT INTO download_logs (user_id, design_id, format) VALUES (?,?,?)", userId, designId, format);
        } catch (Exception ignored) {}
    }

    private void setAttachmentHeader(HttpServletResponse response, String filename, String contentType) {
        response.setContentType(contentType);
        response.setHeader("Content-Disposition", "attachment; filename=\"" +
                URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20") + "\"");
    }
}
