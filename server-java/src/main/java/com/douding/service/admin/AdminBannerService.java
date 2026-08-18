package com.douding.service.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.douding.entity.Banner;
import com.douding.mapper.BannerMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminBannerService {

    private final BannerMapper bannerMapper;

    public Page<Banner> listBanners(int page, int limit, Integer status) {
        LambdaQueryWrapper<Banner> qw = new LambdaQueryWrapper<>();
        if (status != null) qw.eq(Banner::getStatus, status);
        qw.orderByAsc(Banner::getSortOrder).orderByDesc(Banner::getCreatedAt);
        return bannerMapper.selectPage(new Page<>(page, limit), qw);
    }

    public Banner getBanner(Long id) { return bannerMapper.selectById(id); }

    @Transactional
    public void createBanner(Banner banner) { bannerMapper.insert(banner); }

    @Transactional
    public Banner updateBanner(Long id, Banner updates) {
        Banner b = bannerMapper.selectById(id);
        if (b == null) return null;
        if (updates.getTitle() != null) b.setTitle(updates.getTitle());
        if (updates.getSubtitle() != null) b.setSubtitle(updates.getSubtitle());
        if (updates.getImageUrl() != null) b.setImageUrl(updates.getImageUrl());
        if (updates.getBgColor() != null) b.setBgColor(updates.getBgColor());
        if (updates.getLinkType() != null) b.setLinkType(updates.getLinkType());
        if (updates.getLinkValue() != null) b.setLinkValue(updates.getLinkValue());
        if (updates.getSortOrder() != null) b.setSortOrder(updates.getSortOrder());
        if (updates.getStatus() != null) b.setStatus(updates.getStatus());
        if (updates.getStartTime() != null) b.setStartTime(updates.getStartTime());
        if (updates.getEndTime() != null) b.setEndTime(updates.getEndTime());
        bannerMapper.updateById(b);
        return b;
    }

    @Transactional
    public void deleteBanner(Long id) { bannerMapper.deleteById(id); }
}
