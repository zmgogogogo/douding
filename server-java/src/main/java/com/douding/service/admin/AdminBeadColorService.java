package com.douding.service.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.douding.entity.BeadBrand;
import com.douding.entity.BeadColor;
import com.douding.entity.BeadSeries;
import com.douding.mapper.BeadBrandMapper;
import com.douding.mapper.BeadColorMapper;
import com.douding.mapper.BeadSeriesMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminBeadColorService {

    private final BeadColorMapper colorMapper;
    private final BeadBrandMapper brandMapper;
    private final BeadSeriesMapper seriesMapper;

    public Page<Map<String, Object>> listColors(int page, int limit, String keyword,
                                                 Long brandId, Long seriesId,
                                                 Integer colorType, Integer isDiscontinued) {
        LambdaQueryWrapper<BeadColor> qw = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank())
            qw.and(w -> w.like(BeadColor::getName, keyword).or().like(BeadColor::getHex, keyword));
        if (seriesId != null) qw.eq(BeadColor::getSeriesId, seriesId);
        if (colorType != null) qw.eq(BeadColor::getColorType, colorType);
        if (isDiscontinued != null) qw.eq(BeadColor::getIsDiscontinued, isDiscontinued);

        if (brandId != null) {
            List<BeadSeries> seriesList = seriesMapper.selectList(
                    new LambdaQueryWrapper<BeadSeries>().eq(BeadSeries::getBrandId, brandId));
            if (!seriesList.isEmpty())
                qw.in(BeadColor::getSeriesId, seriesList.stream().map(BeadSeries::getId).toList());
        }

        qw.orderByAsc(BeadColor::getSortOrder);
        Page<BeadColor> colorPage = colorMapper.selectPage(new Page<>(page, limit), qw);

        List<Map<String, Object>> enriched = colorPage.getRecords().stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId()); m.put("name", c.getName()); m.put("hex", c.getHex());
            m.put("labL", c.getLabL()); m.put("labA", c.getLabA()); m.put("labB", c.getLabB());
            m.put("colorType", c.getColorType()); m.put("isHot", c.getIsHot());
            m.put("isDiscontinued", c.getIsDiscontinued()); m.put("sortOrder", c.getSortOrder());
            m.put("seriesId", c.getSeriesId());
            BeadSeries s = seriesMapper.selectById(c.getSeriesId());
            m.put("seriesName", s != null ? s.getName() : "");
            if (s != null) {
                m.put("brandId", s.getBrandId());
                BeadBrand b = brandMapper.selectById(s.getBrandId());
                m.put("brandName", b != null ? b.getName() : "");
            }
            return m;
        }).toList();

        Page<Map<String, Object>> result = new Page<>(page, limit);
        result.setTotal(colorPage.getTotal());
        result.setRecords(enriched);
        return result;
    }

    @Transactional
    public void updateColor(Long id, Map<String, Object> updates) {
        BeadColor c = colorMapper.selectById(id);
        if (c == null) return;
        if (updates.containsKey("name")) c.setName((String) updates.get("name"));
        if (updates.containsKey("hex")) c.setHex((String) updates.get("hex"));
        if (updates.containsKey("isDiscontinued")) c.setIsDiscontinued(toInt(updates.get("isDiscontinued")));
        if (updates.containsKey("isHot")) c.setIsHot(toInt(updates.get("isHot")));
        if (updates.containsKey("labL")) c.setLabL(toDouble(updates.get("labL")));
        if (updates.containsKey("labA")) c.setLabA(toDouble(updates.get("labA")));
        if (updates.containsKey("labB")) c.setLabB(toDouble(updates.get("labB")));
        if (updates.containsKey("colorType")) c.setColorType(toInt(updates.get("colorType")));
        colorMapper.updateById(c);
    }

    @Transactional
    public void batchUpdateDiscontinued(List<Long> ids, boolean discontinued) {
        for (Long id : ids) {
            BeadColor c = colorMapper.selectById(id);
            if (c != null) { c.setIsDiscontinued(discontinued ? 1 : 0); colorMapper.updateById(c); }
        }
    }

    public List<BeadBrand> listBrands() { return brandMapper.selectList(null); }

    public List<BeadSeries> listSeries(Long brandId) {
        if (brandId != null) return seriesMapper.selectList(
                new LambdaQueryWrapper<BeadSeries>().eq(BeadSeries::getBrandId, brandId));
        return seriesMapper.selectList(null);
    }

    private Integer toInt(Object v) {
        if (v instanceof Boolean b) return b ? 1 : 0;
        if (v instanceof Number n) return n.intValue();
        return null;
    }
    private Double toDouble(Object v) {
        if (v instanceof Number n) return n.doubleValue();
        return null;
    }
}
