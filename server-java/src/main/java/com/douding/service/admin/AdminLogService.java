package com.douding.service.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.douding.entity.SysOperationLog;
import com.douding.mapper.SysOperationLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminLogService {

    private final SysOperationLogMapper logMapper;

    public Page<SysOperationLog> listLogs(int page, int limit, Long adminId, String module,
                                           String action, String startDate, String endDate, String keyword) {
        LambdaQueryWrapper<SysOperationLog> qw = new LambdaQueryWrapper<>();
        if (adminId != null) qw.eq(SysOperationLog::getAdminId, adminId);
        if (module != null && !module.isBlank()) qw.eq(SysOperationLog::getModule, module);
        if (action != null && !action.isBlank()) qw.eq(SysOperationLog::getAction, action);
        if (keyword != null && !keyword.isBlank())
            qw.and(w -> w.like(SysOperationLog::getAdminName, keyword).or().like(SysOperationLog::getDetail, keyword));
        if (startDate != null && !startDate.isBlank())
            qw.ge(SysOperationLog::getCreatedAt, startDate + " 00:00:00");
        if (endDate != null && !endDate.isBlank())
            qw.le(SysOperationLog::getCreatedAt, endDate + " 23:59:59");
        qw.orderByDesc(SysOperationLog::getCreatedAt);
        return logMapper.selectPage(new Page<>(page, limit), qw);
    }

    public SysOperationLog getLogDetail(Long id) { return logMapper.selectById(id); }

    public Map<String, Object> getLogSummary() {
        Map<String, Object> summary = new LinkedHashMap<>();

        // by module
        List<SysOperationLog> all = logMapper.selectList(null);
        Map<String, Long> byModule = new LinkedHashMap<>();
        Map<String, Long> byAction = new LinkedHashMap<>();
        long todayCount = 0, monthCount = 0, totalCount = all.size(), failedCount = 0;
        String todayDate = java.time.LocalDate.now().toString();
        String monthPrefix = todayDate.substring(0, 7);

        for (SysOperationLog log : all) {
            byModule.merge(log.getModule(), 1L, Long::sum);
            byAction.merge(log.getAction(), 1L, Long::sum);
            if (log.getCreatedAt() != null) {
                String date = log.getCreatedAt().toString();
                if (date.startsWith(todayDate)) todayCount++;
                if (date.startsWith(monthPrefix)) monthCount++;
            }
            if (log.getStatus() != null && log.getStatus() == 0) failedCount++;
        }

        summary.put("byModule", byModule.entrySet().stream()
                .map(e -> Map.of("module", e.getKey(), "count", e.getValue())).toList());
        summary.put("byAction", byAction.entrySet().stream()
                .map(e -> Map.of("action", e.getKey(), "count", e.getValue())).toList());
        summary.put("todayCount", todayCount);
        summary.put("monthCount", monthCount);
        summary.put("totalCount", totalCount);
        summary.put("failedCount", failedCount);
        summary.put("failureRate", totalCount > 0
                ? String.format("%.2f%%", (double) failedCount / totalCount * 100) : "0%");
        return summary;
    }
}
