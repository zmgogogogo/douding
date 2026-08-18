package com.douding.controller.admin;

import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.security.AdminOperationLog;
import com.douding.service.admin.AdminBeadColorService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** 管理后台：色板管理 — 替代 Express routes/admin/beadColors.js */
@RestController
@RequestMapping("/api/admin/bead-colors")
@RequiredArgsConstructor
public class AdminBeadColorsController {

    private final AdminBeadColorService colorService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") int page,
                          @RequestParam(defaultValue = "20") int limit,
                          @RequestParam(required = false) String keyword,
                          @RequestParam(required = false) Long brandId,
                          @RequestParam(required = false) Long seriesId,
                          @RequestParam(required = false) Integer colorType,
                          @RequestParam(required = false) Integer isDiscontinued) {
        var result = colorService.listColors(page, limit, keyword, brandId, seriesId, colorType, isDiscontinued);
        return Result.paginated(result.getRecords(), result.getTotal(), page, limit);
    }

    @PutMapping("/{id}")
    @AdminOperationLog(module = "色板管理", action = "update", targetType = "bead_color")
    public Result<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        colorService.updateColor(id, body);
        return Result.success(Map.of("id", id));
    }

    @PostMapping("/batch-status")
    @AdminOperationLog(module = "色板管理", action = "批量停产", targetType = "bead_color")
    public Result<?> batchStatus(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Integer> idsRaw = (List<Integer>) body.get("ids");
        List<Long> ids = idsRaw.stream().map(Long::valueOf).toList();
        boolean discontinued = body.get("isDiscontinued") instanceof Boolean b ? b : false;
        colorService.batchUpdateDiscontinued(ids, discontinued);
        return Result.success(Map.of("count", ids.size()));
    }

    @GetMapping("/brands/list")
    public Result<?> brandList() {
        return Result.success(colorService.listBrands());
    }

    @GetMapping("/series/list")
    public Result<?> seriesList(@RequestParam(required = false) Long brandId) {
        return Result.success(colorService.listSeries(brandId));
    }
}
