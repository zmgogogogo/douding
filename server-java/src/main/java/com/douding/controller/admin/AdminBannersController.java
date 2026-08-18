package com.douding.controller.admin;

import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.entity.Banner;
import com.douding.security.AdminOperationLog;
import com.douding.service.admin.AdminBannerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

/** 管理后台：Banner 管理 — 替代 Express routes/admin/banners.js */
@RestController
@RequestMapping("/api/admin/banners")
@RequiredArgsConstructor
public class AdminBannersController {

    private final AdminBannerService bannerService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") int page,
                          @RequestParam(defaultValue = "20") int limit,
                          @RequestParam(required = false) Integer status) {
        var result = bannerService.listBanners(page, limit, status);
        return Result.paginated(result.getRecords(), result.getTotal(), page, limit);
    }

    @GetMapping("/{id}")
    public Result<Banner> detail(@PathVariable Long id) {
        Banner banner = bannerService.getBanner(id);
        if (banner == null) throw AppException.notFound("Banner不存在");
        return Result.success(banner);
    }

    @PostMapping
    @AdminOperationLog(module = "运营管理", action = "create", targetType = "banner")
    public Result<Banner> create(@RequestBody Banner banner) {
        bannerService.createBanner(banner);
        return Result.success(banner);
    }

    @PutMapping("/{id}")
    @AdminOperationLog(module = "运营管理", action = "update", targetType = "banner")
    public Result<Banner> update(@PathVariable Long id, @RequestBody Banner updates) {
        Banner banner = bannerService.updateBanner(id, updates);
        if (banner == null) throw AppException.notFound("Banner不存在");
        return Result.success(banner);
    }

    @DeleteMapping("/{id}")
    @AdminOperationLog(module = "运营管理", action = "delete", targetType = "banner")
    public Result<Void> delete(@PathVariable Long id) {
        bannerService.deleteBanner(id);
        return Result.success();
    }
}
