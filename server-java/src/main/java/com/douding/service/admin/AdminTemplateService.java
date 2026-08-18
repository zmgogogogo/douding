package com.douding.service.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.douding.entity.Design;
import com.douding.entity.User;
import com.douding.mapper.DesignMapper;
import com.douding.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminTemplateService {

    private final DesignMapper designMapper;
    private final UserMapper userMapper;
    private final JdbcTemplate jdbc;

    public Page<Map<String, Object>> listDesigns(int page, int limit, String keyword, Integer status,
                                                  Integer isPublic, Long userId, String sort) {
        LambdaQueryWrapper<Design> qw = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank())
            qw.and(w -> w.like(Design::getTitle, keyword).or().eq(Design::getId, parseIntOrNull(keyword)));
        if (status != null) {
            qw.eq(Design::getStatus, status);
        } else {
            // 默认只显示待审核(0)和已发布(1)，隐藏驳回(-1)和下架(-2)
            qw.in(Design::getStatus, 0, 1);
        }
        if (isPublic != null) qw.eq(Design::getIsPublic, isPublic);
        if (userId != null) qw.eq(Design::getUserId, userId);

        if ("created_at_asc".equals(sort)) qw.orderByAsc(Design::getCreatedAt);
        else if ("likes_desc".equals(sort)) qw.orderByDesc(Design::getLikesCount);
        else if ("views_desc".equals(sort)) qw.orderByDesc(Design::getViewsCount);
        else qw.orderByDesc(Design::getCreatedAt);

        Page<Design> designPage = designMapper.selectPage(new Page<>(page, limit), qw);
        List<Map<String, Object>> list = designPage.getRecords().stream().map(d -> {
            User author = userMapper.selectById(d.getUserId());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId()); m.put("title", d.getTitle());
            m.put("authorId", d.getUserId());
            m.put("authorName", author != null ? author.getNickname() : "");
            m.put("gridWidth", d.getGridWidth()); m.put("gridHeight", d.getGridHeight());
            m.put("beadCount", d.getBeadCount()); m.put("colorCount", d.getColorCount());
            m.put("likesCount", d.getLikesCount()); m.put("viewsCount", d.getViewsCount());
            m.put("isPublic", d.getIsPublic()); m.put("status", d.getStatus());
            m.put("isRecommended", d.getIsRecommended()); m.put("weight", d.getWeight());
            m.put("brand", d.getBrand()); m.put("reviewComment", d.getReviewComment());
            m.put("thumbnail", d.getThumbnail());
            m.put("createdAt", d.getCreatedAt()); m.put("updatedAt", d.getUpdatedAt());
            return m;
        }).toList();

        Page<Map<String, Object>> result = new Page<>(page, limit);
        result.setTotal(designPage.getTotal());
        result.setRecords(list);
        return result;
    }

    public Map<String, Object> getDesignDetail(Long id) {
        Design d = designMapper.selectById(id);
        if (d == null) return null;
        User author = userMapper.selectById(d.getUserId());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId()); m.put("title", d.getTitle());
        m.put("userId", d.getUserId()); m.put("authorName", author != null ? author.getNickname() : "");
        m.put("description", d.getDescription()); m.put("gridWidth", d.getGridWidth());
        m.put("gridHeight", d.getGridHeight()); m.put("gridData", d.getGridData());
        m.put("thumbnail", d.getThumbnail()); m.put("isPublic", d.getIsPublic());
        m.put("beadCount", d.getBeadCount()); m.put("colorCount", d.getColorCount());
        m.put("likesCount", d.getLikesCount()); m.put("viewsCount", d.getViewsCount());
        m.put("brand", d.getBrand());
        m.put("status", d.getStatus()); m.put("isRecommended", d.getIsRecommended());
        m.put("weight", d.getWeight()); m.put("reviewComment", d.getReviewComment());
        m.put("createdAt", d.getCreatedAt()); m.put("updatedAt", d.getUpdatedAt());
        return m;
    }

    @Transactional
    public void updateDesign(Long id, String title, String description, Boolean isPublic,
                              Boolean isRecommended, Integer weight, String reviewComment) {
        Design d = designMapper.selectById(id);
        if (d == null) return;
        if (title != null) d.setTitle(title);
        if (description != null) d.setDescription(description);
        if (isPublic != null) d.setIsPublic(isPublic ? 1 : 0);
        if (isRecommended != null) d.setIsRecommended(isRecommended ? 1 : 0);
        if (weight != null) d.setWeight(weight);
        if (reviewComment != null) d.setReviewComment(reviewComment);
        designMapper.updateById(d);
    }

    @Transactional
    public void updateStatus(Long id, Integer status, String comment) {
        Design d = designMapper.selectById(id);
        if (d == null) return;
        d.setStatus(status);
        d.setReviewComment(comment != null ? comment : "");
        designMapper.updateById(d);
    }

    @Transactional
    public void batchUpdateStatus(List<Long> ids, Integer status, String comment) {
        for (Long id : ids) updateStatus(id, status, comment);
    }

    /**
     * 物理删除设计 + 级联清理所有关联数据
     */
    @Transactional
    public void physicalDelete(Long id) {
        Design d = designMapper.selectById(id);
        if (d == null) return;

        // 删除所有关联数据（按依赖顺序）
        jdbc.update("DELETE FROM comment_likes WHERE comment_id IN (SELECT id FROM design_comments WHERE design_id = ?)", id);
        jdbc.update("DELETE FROM design_comments WHERE design_id = ?", id);
        jdbc.update("DELETE FROM design_likes WHERE design_id = ?", id);
        jdbc.update("DELETE FROM design_favorites WHERE design_id = ?", id);
        jdbc.update("DELETE FROM make_progress_snapshots WHERE session_id IN (SELECT id FROM make_sessions WHERE design_id = ?)", id);
        jdbc.update("DELETE FROM make_records WHERE design_id = ?", id);
        jdbc.update("DELETE FROM make_sessions WHERE design_id = ?", id);
        jdbc.update("DELETE FROM download_logs WHERE design_id = ?", id);
        jdbc.update("DELETE FROM design_bead_usage WHERE design_id = ?", id);

        // 最后删除设计本身
        designMapper.deleteById(id);
    }

    private Long parseIntOrNull(String s) {
        try { return Long.parseLong(s); } catch (Exception e) { return 0L; }
    }
}
