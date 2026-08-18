package com.douding.controller.admin;

import com.douding.common.Result;
import com.douding.service.admin.AdminMakeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** 管理后台：制作模式管理 — 替代 Express routes/admin/make.js */
@RestController
@RequestMapping("/api/admin/make")
@RequiredArgsConstructor
public class AdminMakeController {

    private final AdminMakeService makeService;

    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.success(makeService.getMakeStats());
    }

    @GetMapping("/ranking")
    public Result<?> ranking(@RequestParam(defaultValue = "20") int limit) {
        return Result.success(makeService.getMakeRanking(limit));
    }

    @GetMapping("/records")
    public Result<?> records(@RequestParam(defaultValue = "1") int page,
                             @RequestParam(defaultValue = "20") int limit,
                             @RequestParam(required = false) Long userId,
                             @RequestParam(required = false) Long designId,
                             @RequestParam(required = false) String startDate,
                             @RequestParam(required = false) String endDate) {
        var result = makeService.listMakeRecords(page, limit, userId, designId, startDate, endDate);
        return Result.paginated(result.getRecords(), result.getTotal(), page, limit);
    }
}
