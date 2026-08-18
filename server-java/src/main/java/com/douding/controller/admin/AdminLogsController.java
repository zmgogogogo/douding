package com.douding.controller.admin;

import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.entity.SysOperationLog;
import com.douding.service.admin.AdminLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** 管理后台：操作日志 — 替代 Express routes/admin/logs.js */
@RestController
@RequestMapping("/api/admin/logs")
@RequiredArgsConstructor
public class AdminLogsController {

    private final AdminLogService logService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") int page,
                          @RequestParam(defaultValue = "20") int limit,
                          @RequestParam(required = false) Long adminId,
                          @RequestParam(required = false) String module,
                          @RequestParam(required = false) String action,
                          @RequestParam(required = false) String startDate,
                          @RequestParam(required = false) String endDate,
                          @RequestParam(required = false) String keyword) {
        var result = logService.listLogs(page, limit, adminId, module, action, startDate, endDate, keyword);
        return Result.paginated(result.getRecords(), result.getTotal(), page, limit);
    }

    @GetMapping("/{id}")
    public Result<SysOperationLog> detail(@PathVariable Long id) {
        SysOperationLog log = logService.getLogDetail(id);
        if (log == null) throw AppException.notFound("日志不存在");
        return Result.success(log);
    }

    @GetMapping("/stats/summary")
    public Result<Map<String, Object>> summary() {
        return Result.success(logService.getLogSummary());
    }
}
