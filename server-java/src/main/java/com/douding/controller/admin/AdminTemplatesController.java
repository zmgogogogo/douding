package com.douding.controller.admin;

import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.security.AdminOperationLog;
import com.douding.service.admin.AdminTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** 管理后台：内容管理 — 替代 Express routes/admin/templates.js */
@RestController
@RequestMapping("/api/admin/templates")
@RequiredArgsConstructor
public class AdminTemplatesController {

    private final AdminTemplateService templateService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") int page,
                          @RequestParam(defaultValue = "20") int limit,
                          @RequestParam(required = false) String keyword,
                          @RequestParam(required = false) Integer status,
                          @RequestParam(required = false) Integer isPublic,
                          @RequestParam(required = false) Long userId,
                          @RequestParam(defaultValue = "created_at_desc") String sort) {
        var result = templateService.listDesigns(page, limit, keyword, status, isPublic, userId, sort);
        return Result.paginated(result.getRecords(), result.getTotal(), page, limit);
    }

    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable Long id) {
        Map<String, Object> data = templateService.getDesignDetail(id);
        if (data == null) throw AppException.notFound("设计不存在");
        return Result.success(data);
    }

    @PutMapping("/{id}")
    @AdminOperationLog(module = "内容管理", action = "update", targetType = "design")
    public Result<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        templateService.updateDesign(id,
                (String) body.get("title"),
                (String) body.get("description"),
                body.get("isPublic") instanceof Boolean b ? b : null,
                body.get("isRecommended") instanceof Boolean b ? b : null,
                body.get("weight") instanceof Number n ? n.intValue() : null,
                (String) body.get("reviewComment"));
        return Result.success(Map.of("id", id));
    }

    @PutMapping("/{id}/status")
    @PatchMapping("/{id}/status")
    @AdminOperationLog(module = "内容管理", action = "审核", targetType = "design")
    public Result<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        int status = ((Number) body.get("status")).intValue();
        String comment = (String) body.getOrDefault("comment", "");
        templateService.updateStatus(id, status, comment);
        return Result.success(Map.of("id", id, "status", status, "comment", comment));
    }

    @PostMapping("/batch-status")
    @AdminOperationLog(module = "内容管理", action = "批量操作", targetType = "design")
    public Result<?> batchStatus(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Integer> idsRaw = (List<Integer>) body.get("ids");
        List<Long> ids = idsRaw.stream().map(Long::valueOf).toList();
        int status = ((Number) body.get("status")).intValue();
        String comment = (String) body.getOrDefault("comment", "");
        templateService.batchUpdateStatus(ids, status, comment);
        return Result.success(Map.of("count", ids.size()));
    }

    /** 物理删除 — 彻底删除作品及所有关联数据 */
    @DeleteMapping("/{id}")
    @AdminOperationLog(module = "内容管理", action = "物理删除", targetType = "design")
    public Result<?> physicalDelete(@PathVariable Long id) {
        templateService.physicalDelete(id);
        return Result.success(Map.of("id", id));
    }
}
