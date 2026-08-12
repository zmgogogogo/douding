package com.douding.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.douding.common.AppException;
import com.douding.common.Result;
import com.douding.dto.CreateDesignDTO;
import com.douding.entity.Design;
import com.douding.entity.User;
import com.douding.mapper.DesignMapper;
import com.douding.mapper.UserMapper;
import com.douding.security.AuthRequired;
import com.douding.security.CurrentUser;
import com.douding.security.JwtTokenProvider;
import com.douding.vo.DesignVO;
import com.douding.vo.UserVO;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.*;

/**
 * 设计 CRUD 控制器 — 替代 routes/designs.js
 */
@Slf4j
@Tag(name = "设计管理")
@RestController
@RequestMapping("/api/designs")
@RequiredArgsConstructor
public class DesignController {

    private final DesignMapper designMapper;
    private final UserMapper userMapper;
    private final ObjectMapper objectMapper; // Spring 自动配置的 ObjectMapper（含 JavaTimeModule）

    /** 创建设计 */
    @PostMapping
    @AuthRequired
    public Result<DesignVO> create(@CurrentUser JwtTokenProvider.TokenClaims claims,
                                    @RequestBody CreateDesignDTO dto) {
        if (dto.getTitle() == null || dto.getGridData() == null
                || dto.getGridWidth() == null || dto.getGridHeight() == null) {
            throw AppException.badRequest("缺少必要参数");
        }

        // 统计珠子数量
        int[] stats = countBeads(dto.getGridData());
        String gridStr = dto.getGridData() instanceof String
                ? (String) dto.getGridData()
                : toJson(dto.getGridData());

        Design design = new Design();
        design.setUserId(claims.id());
        design.setFolderId(dto.getFolderId());
        design.setTitle(dto.getTitle());
        design.setDescription(dto.getDescription() != null ? dto.getDescription() : "");
        design.setGridWidth(dto.getGridWidth());
        design.setGridHeight(dto.getGridHeight());
        design.setGridData(gridStr);
        design.setThumbnail(dto.getThumbnail());
        design.setIsPublic(dto.getIsPublic() != null && dto.getIsPublic() ? 1 : 0);
        design.setBrand(dto.getBrand() != null ? dto.getBrand() : "Hama");
        design.setBeadCount(stats[0]);
        design.setColorCount(stats[1]);

        designMapper.insert(design);
        return Result.success(DesignVO.from(design));
    }

    /** 更新设计 */
    @PutMapping("/{id}")
    @AuthRequired
    public Result<DesignVO> update(@PathVariable Long id,
                                    @CurrentUser JwtTokenProvider.TokenClaims claims,
                                    @RequestBody CreateDesignDTO dto) {
        Design design = designMapper.selectById(id);
        if (design == null || !design.getUserId().equals(claims.id())) {
            throw AppException.notFound("设计不存在或无权修改");
        }

        if (dto.getTitle() != null) design.setTitle(dto.getTitle());
        if (dto.getDescription() != null) design.setDescription(dto.getDescription());
        if (dto.getGridWidth() != null) design.setGridWidth(dto.getGridWidth());
        if (dto.getGridHeight() != null) design.setGridHeight(dto.getGridHeight());
        if (dto.getThumbnail() != null) design.setThumbnail(dto.getThumbnail());
        if (dto.getFolderId() != null) design.setFolderId(dto.getFolderId());
        if (dto.getIsPublic() != null) design.setIsPublic(dto.getIsPublic() ? 1 : 0);

        if (dto.getGridData() != null) {
            String gridStr = dto.getGridData() instanceof String
                    ? (String) dto.getGridData()
                    : toJson(dto.getGridData());
            design.setGridData(gridStr);
            int[] stats = countBeads(dto.getGridData());
            design.setBeadCount(stats[0]);
            design.setColorCount(stats[1]);
        }

        design.setUpdatedAt(LocalDateTime.now());
        designMapper.updateById(design);

        return Result.success(DesignVO.from(design));
    }

    /** 设计详情 */
    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable Long id,
                                               @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Design design = designMapper.selectById(id);
        if (design == null) {
            throw AppException.notFound("设计不存在");
        }

        // 浏览量+1
        design.setViewsCount(design.getViewsCount() + 1);
        designMapper.updateById(design);

        User user = userMapper.selectById(design.getUserId());

        // 是否已点赞
        boolean liked = false;
        // TODO: 查询点赞表

        Map<String, Object> result = new LinkedHashMap<>();
        result.putAll(toMap(DesignVO.from(design)));
        result.put("author", user != null ? UserVO.from(user) : null);
        result.put("liked", liked);

        return Result.success(result);
    }

    /** 删除设计 */
    @DeleteMapping("/{id}")
    @AuthRequired
    public Result<Void> delete(@PathVariable Long id,
                                @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Design design = designMapper.selectById(id);
        if (design == null || !design.getUserId().equals(claims.id())) {
            throw AppException.notFound("设计不存在或无权删除");
        }
        designMapper.deleteById(id);
        return Result.success(null);
    }

    /** 我的设计列表 */
    @GetMapping
    @AuthRequired
    public Result<Result.PageData<DesignVO>> list(
            @CurrentUser JwtTokenProvider.TokenClaims claims,
            @RequestParam(required = false) Long folder_id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {

        LambdaQueryWrapper<Design> qw = new LambdaQueryWrapper<Design>()
                .eq(Design::getUserId, claims.id())
                .orderByDesc(Design::getUpdatedAt);

        if (folder_id != null) {
            qw.eq(Design::getFolderId, folder_id);
        }

        Page<Design> result = designMapper.selectPage(new Page<>(page, limit), qw);
        List<DesignVO> list = result.getRecords().stream().map(DesignVO::from).toList();
        return Result.paginated(list, result.getTotal(), page, limit);
    }

    /** 发布设计 */
    @PutMapping("/{id}/publish")
    @AuthRequired
    public Result<DesignVO> publish(@PathVariable Long id,
                                     @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Design design = checkOwner(id, claims.id());
        boolean isFirst = design.getIsPublic() == 0;
        design.setIsPublic(1);
        if (isFirst) design.setPublishedAt(LocalDateTime.now());
        design.setUpdatedAt(LocalDateTime.now());
        designMapper.updateById(design);
        return Result.success(DesignVO.from(design));
    }

    /** 取消发布 */
    @PutMapping("/{id}/unpublish")
    @AuthRequired
    public Result<DesignVO> unpublish(@PathVariable Long id,
                                       @CurrentUser JwtTokenProvider.TokenClaims claims) {
        Design design = checkOwner(id, claims.id());
        design.setIsPublic(0);
        design.setUpdatedAt(LocalDateTime.now());
        designMapper.updateById(design);
        return Result.success(DesignVO.from(design));
    }

    // ========== 私有工具方法 ==========

    private Design checkOwner(Long designId, Long userId) {
        Design design = designMapper.selectById(designId);
        if (design == null || !design.getUserId().equals(userId)) {
            throw AppException.notFound("设计不存在或无权操作");
        }
        return design;
    }

    /** 统计珠子数量和颜色数 */
    @SuppressWarnings("unchecked")
    private int[] countBeads(Object gridData) {
        if (!(gridData instanceof List)) return new int[]{0, 0};
        List<List<Map<String, Object>>> grid = (List<List<Map<String, Object>>>) gridData;
        int beadCount = 0;
        Set<String> colors = new HashSet<>();
        for (List<Map<String, Object>> row : grid) {
            if (row == null) continue;
            for (Map<String, Object> cell : row) {
                if (cell != null && cell.get("hex") != null) {
                    beadCount++;
                    colors.add(cell.get("hex").toString().toUpperCase());
                }
            }
        }
        return new int[]{beadCount, colors.size()};
    }

    /** 简单 JSON 序列化 */
    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.error("JSON 序列化失败: {}", e.getMessage(), e);
            return "[]";
        }
    }

    /** 将 VO 转为 Map（使用 Spring 自动配置的 ObjectMapper，支持 LocalDateTime 等 Java 8 时间类型） */
    private Map<String, Object> toMap(Object vo) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = objectMapper.convertValue(vo, Map.class);
            return map;
        } catch (Exception e) {
            log.error("VO 转 Map 失败: {}", e.getMessage(), e);
            return new LinkedHashMap<>();
        }
    }
}
