-- ============================================
-- V16: 拼豆色卡数据补全
-- 新增: Perler, Nabbi
-- 补全: 咪小窝, 盼盼, Artkal
-- 数据来源: maxcleme/beadcolors + HansBug/pindou-color-data
-- 生成时间: 2026-08-10
-- ============================================

-- 安全：先尝试 delete 旧数据（幂等）
-- ==================================================
-- 清理旧数据（幂等）
DELETE FROM bead_colors WHERE series_id IN (SELECT id FROM bead_series WHERE brand_id = 9);
DELETE FROM bead_series WHERE brand_id = 9;
DELETE FROM bead_brands WHERE id = 9;

-- Perler (id=9, slug=perler)
-- ==================================================
INSERT INTO bead_brands(id, name, slug) VALUES(9, 'Perler', 'perler');

-- 系列: Neon 霓虹 (1色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(300, 9, 'Neon 霓虹', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2200, 300, '80-15089 Neon Blue', '#406AE1', 0);

-- 系列: Pastel 粉彩 (3色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(301, 9, 'Pastel 粉彩', 1);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2201, 301, '80-15202 Robin''s Egg', '#A9CDD5', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2202, 301, '80-15215 Mist', '#93B0BD', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2203, 301, '80-19058 Toothpaste', '#96D1D4', 0);

-- 系列: Standard 标准色 (9色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(302, 9, 'Standard 标准色', 2);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2204, 302, '80-15248 Eggplant', '#6F3255', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2205, 302, '80-15261 Dark Spruce', '#14313B', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2206, 302, '80-15273 Brick', '#FC9574', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2207, 302, '80-15274 Rich Butter', '#F6CA69', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2208, 302, '80-15275 Peacock', '#0090AC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2209, 302, '80-15268 Sunflower', '#DEBA0B', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2210, 302, '80-15269 Lemon', '#F6D901', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2211, 302, '80-15263 Celery', '#BED4A6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2212, 302, '80-15239 Mocha', '#C8B693', 0);

-- 系列: 棕色系 (8色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(303, 9, '棕色系', 3);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2213, 303, '80-15205 Fawn', '#C9A385', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2214, 303, '80-19012 Brown', '#674C44', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2215, 303, '80-19020 Rust', '#995043', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2216, 303, '80-19021 Light Brown', '#936848', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2217, 303, '80-19035 Tan', '#C5AC90', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2218, 303, '80-19098 Sand', '#E5BE9E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2219, 303, '80-15250 Gingerbread', '#7E5446', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2220, 303, '80-15262 Cocoa', '#392928', 0);

-- 系列: 橙色系 (9色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(304, 9, '橙色系', 4);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2221, 304, '80-15213 Apricot', '#F5A168', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2222, 304, '80-15214 Sherbet', '#D8E47C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2223, 304, '80-19004 Orange', '#EB7B31', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2224, 304, '80-19033 Peach', '#E9BFB9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2225, 304, '80-19057 Cheddar', '#FBB146', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2226, 304, '80-19090 Butterscotch', '#DA9964', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2227, 304, '80-15246 Tangerine', '#FD5918', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2228, 304, '80-15249 Honey', '#DA8C2C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2229, 304, '80-15255 Orange Cream', '#EFB79B', 0);

-- 系列: 粉色系 (11色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(305, 9, '粉色系', 5);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2230, 305, '80-15203 Flamingo', '#F2AFB7', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2231, 305, '80-19006 Bubblegum', '#D8729A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2232, 305, '80-19038 Magenta', '#E04284', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2233, 305, '80-19063 Blush', '#F99297', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2234, 305, '80-19079 Light Pink', '#E1BCCE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2235, 305, '80-19083 Pink', '#D45496', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2236, 305, '80-19088 Raspberry', '#983864', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2237, 305, '80-15244 Rose', '#D25D72', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2238, 305, '80-15256 Fruit Punch', '#CA3B65', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2239, 305, '80-15257 Fuchsia', '#CB59B9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2240, 305, '80-15276 Carnation Pink', '#F8C7C9', 0);

-- 系列: 紫色系 (12色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(306, 9, '紫色系', 6);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2241, 306, '80-15182 Lavender', '#AF9FCE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2242, 306, '80-15210 Orchid', '#B1628E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2243, 306, '80-19007 Purple', '#684B86', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2244, 306, '80-19054 Pastel Lavender', '#937FBF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2245, 306, '80-19060 Plum', '#A75D9D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2246, 306, '80-15242 Cotton Candy', '#F479B0', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2247, 306, '80-15243 Grape', '#503B9C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2248, 306, '80-15245 Iris', '#4E56A3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2249, 306, '80-15251 Thistle', '#8C8CA7', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2250, 306, '80-15258 Mulberry', '#714875', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2251, 306, '80-15265 Twilight Plum', '#C685B1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2252, 306, '80-15267 Frosted Lilac', '#CDB7C3', 0);

-- 系列: 红色系 (8色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(307, 9, '红色系', 7);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2253, 307, '80-15204 Salmon', '#E1747A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2254, 307, '80-15211 Tomato', '#D14337', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2255, 307, '80-15212 Spice', '#D9593A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2256, 307, '80-15961 Cherry', '#9D2B3A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2257, 307, '80-19005 Red', '#B0353C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2258, 307, '80-19059 Hot Coral', '#DD595B', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2259, 307, '80-19096 Cranapple', '#843947', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2260, 307, '80-15272 Coral', '#FF9A8B', 0);

-- 系列: 绿色系 (16色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(308, 9, '绿色系', 8);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2261, 308, '80-15179 Evergreen', '#305545', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2262, 308, '80-15199 Shamrock', '#008F53', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2263, 308, '80-15219 Fern', '#7F971A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2264, 308, '80-15220 Olive', '#696E31', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2265, 308, '80-19010 Dark Green', '#007B4E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2266, 308, '80-19011 Light Green', '#18C7B1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2267, 308, '80-19053 Pastel Green', '#6DCC94', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2268, 308, '80-19061 Kiwi Lime', '#69B845', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2269, 308, '80-19080 Green', '#4DAB64', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2270, 308, '80-19091 Parrot Green', '#009188', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2271, 308, '80-19097 Prickly Pear', '#BBC938', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2272, 308, '80-15240 Mint', '#B3EED5', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2273, 308, '80-15241 Sour Apple', '#A3DE6F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2274, 308, '80-15247 Forest', '#005D57', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2275, 308, '80-15254 Sage', '#9AA98E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2276, 308, '80-15259 Slime', '#C8C85C', 0);

-- 系列: 蓝绿系 (4色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(309, 9, '蓝绿系', 9);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2277, 309, '80-15217 Lagoon', '#00A4AC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2278, 309, '80-15218 Teal', '#047F8A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2279, 309, '80-19062 Turquoise', '#0098C5', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2280, 309, '80-15266 Caribbean Sea', '#6CC8AD', 0);

-- 系列: 蓝色系 (9色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(310, 9, '蓝色系', 10);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2281, 310, '80-15200 Cobalt', '#0065B1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2282, 310, '80-15201 Midnight', '#2F3C55', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2283, 310, '80-15216 Sky', '#4AC0D8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2284, 310, '80-19008 Dark Blue', '#0E5092', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2285, 310, '80-19009 Light Blue', '#278CC9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2286, 310, '80-19052 Pastel Blue', '#4A9CCF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2287, 310, '80-19070 Periwinkle Blue', '#6683B7', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2288, 310, '80-15252 Slate Blue', '#5E6D7B', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2289, 310, '80-15253 Denim', '#4C6388', 0);

-- 系列: 黄色系 (5色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(311, 9, '黄色系', 11);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2290, 311, '80-15208 Toasted Marshmallow', '#DEDACE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2291, 311, '80-19002 Creme', '#E1E2BB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2292, 311, '80-19003 Yellow', '#E7CE3E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2293, 311, '80-19056 Pastel Yellow', '#E9E290', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2294, 311, '80-19093 Blueberry Creme', '#85A8E3', 0);

-- 系列: 黑白灰 (8色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(312, 9, '黑白灰', 12);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2295, 312, '80-15181 Light Grey', '#B3BAB8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2296, 312, '80-15206 Pewter', '#94A19D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2297, 312, '80-15207 Charcoal', '#4F595A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2298, 312, '80-19001 White', '#EAEFEE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2299, 312, '80-19017 Grey', '#909497', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2300, 312, '80-19018 Black', '#323234', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2301, 312, '80-19092 Dark Grey', '#585C61', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2302, 312, '80-15260 Stone', '#988C8C', 0);

-- ==================================================
-- 清理旧数据（幂等）
DELETE FROM bead_colors WHERE series_id IN (SELECT id FROM bead_series WHERE brand_id = 10);
DELETE FROM bead_series WHERE brand_id = 10;
DELETE FROM bead_brands WHERE id = 10;

-- Nabbi (id=10, slug=nabbi)
-- ==================================================
INSERT INTO bead_brands(id, name, slug) VALUES(10, 'Nabbi', 'nabbi');

-- 系列: Standard 标准色 (30色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(313, 10, 'Standard 标准色', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2303, 313, 'N01 Black', '#3A3D41', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2304, 313, 'N02 Dark Brown', '#50443B', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2305, 313, 'N03 Brown Medium', '#5A3E36', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2306, 313, 'N04 Maroon', '#813547', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2307, 313, 'N05 Caramel', '#A76224', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2308, 313, 'N06 Tan', '#AD967E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2309, 313, 'N07 Sand', '#EEB182', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2310, 313, 'N08 Ash', '#8D8B7F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2311, 313, 'N09 Hunter Green', '#2F4A39', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2312, 313, 'N10 Light Grey', '#D3CBCB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2313, 313, 'N11 Purple', '#644591', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2314, 313, 'N12 Ivory', '#E2D0BF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2315, 313, 'N13 Orange', '#F3601B', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2316, 313, 'N14 Yellow', '#F9CA00', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2317, 313, 'N15 White', '#F4F4F3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2318, 313, 'N16 Green', '#297A3B', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2319, 313, 'N17 Bright Blue', '#3B75CB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2320, 313, 'N18 Light Rose', '#E1B4AB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2321, 313, 'N19 Red', '#DF2638', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2322, 313, 'N20 Light Brown', '#B58B69', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2323, 313, 'N21 Light Yellow', '#F5EC8D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2324, 313, 'N22 Lime', '#48AF4F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2325, 313, 'N23 Medium Blue', '#71A3E6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2326, 313, 'N24 Lavender', '#B6A0DB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2327, 313, 'N25 Pink', '#EE6A97', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2328, 313, 'N26 Peach', '#FCA879', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2329, 313, 'N27 Chocolate', '#875F52', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2330, 313, 'N28 Sky', '#A7C6F1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2331, 313, 'N29 Gold', '#EE9527', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2332, 313, 'N30 Kiwi', '#C7BF5E', 0);

-- ==================================================
-- 清理旧数据（幂等）
DELETE FROM bead_colors WHERE series_id IN (SELECT id FROM bead_series WHERE brand_id = 8);
DELETE FROM bead_series WHERE brand_id = 8;
DELETE FROM bead_brands WHERE id = 8;

-- 盼盼 (id=8, slug=panpan)
-- ==================================================
INSERT INTO bead_brands(id, name, slug) VALUES(8, '盼盼', 'panpan');

-- 系列: 橙棕 (49色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(314, 8, '橙棕', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2333, 314, '29 ', '#FDA951', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2334, 314, '4 ', '#FA8C4F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2335, 314, '88 ', '#FDD94D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2336, 314, '90 ', '#F99C5F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2337, 314, '89 ', '#F47E36', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2338, 314, '100 ', '#FEDB99', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2339, 314, '99 ', '#FDA276', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2340, 314, '131 ', '#FEC667', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2341, 314, '213 ', '#FDE173', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2342, 314, '223 ', '#FCBF80', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2343, 314, '242 ', '#F9D66E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2344, 314, '276 ', '#FAE393', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2345, 314, '274 ', '#E1C9BD', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2346, 314, '289 ', '#FFD785', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2347, 314, '290 ', '#FEC832', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2348, 314, '167 ', '#E0D4BC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2349, 314, '170 ', '#A88764', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2350, 314, '175 ', '#C79266', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2351, 314, '56 ', '#EB903F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2352, 314, '185 ', '#F1E9D4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2353, 314, '182 ', '#FDC24E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2354, 314, '179 ', '#FDA42E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2355, 314, '22 ', '#FB852B', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2356, 314, '230 ', '#E3CCBA', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2357, 314, '234 ', '#A17140', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2358, 314, '224 ', '#F6BB6F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2359, 314, '60 ', '#FDB583', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2360, 314, '255 ', '#D6AA87', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2361, 314, '248 ', '#907C35', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2362, 314, '137 ', '#FAD4BF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2363, 314, '116 ', '#874628', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2364, 314, '246 ', '#D07E4A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2365, 314, '76 ', '#FFE4D3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2366, 314, '49 ', '#FCC6AC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2367, 314, '80 ', '#F1C4A5', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2368, 314, '19 ', '#DCB387', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2369, 314, '43 ', '#E7B34E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2370, 314, '50 ', '#E3A014', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2371, 314, '17 ', '#985C3A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2372, 314, '91 ', '#E4B685', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2373, 314, '87 ', '#DA8C42', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2374, 314, '112 ', '#DAC898', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2375, 314, '113 ', '#FEC993', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2376, 314, '115 ', '#B2714B', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2377, 314, '114 ', '#8B684C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2378, 314, '134 ', '#F2D8C1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2379, 314, '203 ', '#FFE4D6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2380, 314, '208 ', '#DD7D41', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2381, 314, '247 ', '#B38561', 0);

-- 系列: 灰白黑 (47色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(315, 8, '灰白黑', 1);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2382, 315, '168 ', '#BBC6B6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2383, 315, '172 ', '#909994', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2384, 315, '166 ', '#697E80', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2385, 315, '171 ', '#B0A796', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2386, 315, '164 ', '#C6B2BB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2387, 315, '173 ', '#644B51', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2388, 315, '178 ', '#747D7A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2389, 315, '69 ', '#FCFDFF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2390, 315, '71 ', '#F9F9F9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2391, 315, '55 ', '#ABABAB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2392, 315, '195 ', '#DBD9DA', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2393, 315, '190 ', '#E9EDEE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2394, 315, '151 ', '#FCECF7', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2395, 315, '160 ', '#D8D4D3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2396, 315, '152 ', '#56534E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2397, 315, 'UNKNOWN-04 ', '#F8F5FE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2398, 315, '64 ', '#F0FEE4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2399, 315, '118 ', '#E2E4F0', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2400, 315, '153 ', '#D8C2D9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2401, 315, '217 ', '#EADBF8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2402, 315, '221 ', '#FBF4EC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2403, 315, '220 ', '#F7E3EC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2404, 315, '241 ', '#D7C6CE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2405, 315, '250 ', '#937D8A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2406, 315, '133 ', '#F6F8E3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2407, 315, '15 ', '#FBFBFB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2408, 315, '1 ', '#000000', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2409, 315, '13 ', '#B4B4B4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2410, 315, '78 ', '#878787', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2411, 315, '45 ', '#464648', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2412, 315, '51 ', '#2C2C2C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2413, 315, '14 ', '#010101', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2414, 315, '85 ', '#E7D6DC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2415, 315, '95 ', '#EFEDEE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2416, 315, '86 ', '#ECEAEB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2417, 315, '123 ', '#CDCDCD', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2418, 315, '132 ', '#FDF6EE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2419, 315, '146 ', '#CED7D4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2420, 315, '201 ', '#98A6A6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2421, 315, '200 ', '#1B1213', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2422, 315, '214 ', '#F0EEEF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2423, 315, '219 ', '#FCFFF8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2424, 315, '209 ', '#F2EEE5', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2425, 315, '251 ', '#96A09F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2426, 315, '291 ', '#F8FBE6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2427, 315, '277 ', '#CACAD2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2428, 315, '278 ', '#9B9C94', 0);

-- 系列: 紫 (35色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(316, 8, '紫', 2);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2429, 316, '176 ', '#9D7693', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2430, 316, '187 ', '#DBC7EA', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2431, 316, '24 ', '#F13484', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2432, 316, '70 ', '#945AB1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2433, 316, '229 ', '#D093BC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2434, 316, '236 ', '#9F85CF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2435, 316, '59 ', '#FF6FB7', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2436, 316, '61 ', '#E987EA', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2437, 316, 'UNKNOWN-01 ', '#F7D4E8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2438, 316, '260 ', '#E2A9D2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2439, 316, '261 ', '#AB91C0', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2440, 316, '32 ', '#B34EC6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2441, 316, '27 ', '#B37BDC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2442, 316, '7 ', '#8758A9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2443, 316, '94 ', '#E3D2FE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2444, 316, '93 ', '#D6BAF5', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2445, 316, '92 ', '#301A49', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2446, 316, '104 ', '#DC99CE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2447, 316, '103 ', '#B5038F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2448, 316, '102 ', '#882893', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2449, 316, '124 ', '#9A64B8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2450, 316, '161 ', '#9C34AD', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2451, 316, '162 ', '#940595', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2452, 316, '273 ', '#D6C6EB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2453, 316, '38 ', '#FCC1DD', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2454, 316, '62 ', '#F6BDE8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2455, 316, '6 ', '#E9639E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2456, 316, '40 ', '#F1559F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2457, 316, '41 ', '#C63674', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2458, 316, '98 ', '#E575C7', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2459, 316, '83 ', '#D33997', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2460, 316, '126 ', '#F893BF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2461, 316, '127 ', '#B5026A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2462, 316, '252 ', '#B58B9F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2463, 316, '282 ', '#DEBEE5', 0);

-- 系列: 红粉 (52色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(317, 8, '红粉', 3);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2464, 317, '138 ', '#F85842', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2465, 317, '218 ', '#FD7E77', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2466, 317, '177 ', '#AE8082', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2467, 317, '165 ', '#C37463', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2468, 317, '72 ', '#FEA2A3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2469, 317, '159 ', '#E79273', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2470, 317, '194 ', '#FEBDA7', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2471, 317, '186 ', '#FFDEE9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2472, 317, '188 ', '#FCBFD1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2473, 317, '180 ', '#E8BEC2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2474, 317, '189 ', '#DFAAA4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2475, 317, '181 ', '#A3656A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2476, 317, '67 ', '#D40E1F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2477, 317, '226 ', '#6B372C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2478, 317, '228 ', '#F3C6C0', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2479, 317, '225 ', '#C76A62', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2480, 317, '232 ', '#E58EAE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2481, 317, '254 ', '#DAABB3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2482, 317, '18 ', '#F6D4CB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2483, 317, '20 ', '#EC4072', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2484, 317, '84 ', '#FDDBE9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2485, 317, '125 ', '#F7DAD4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2486, 317, '135 ', '#F5C9CA', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2487, 317, '210 ', '#FBC8DB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2488, 317, '215 ', '#F6BBD1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2489, 317, '253 ', '#C09DA4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2490, 317, '35 ', '#FF9280', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2491, 317, '31 ', '#F73D4B', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2492, 317, '53 ', '#EF4D3E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2493, 317, '54 ', '#F92B40', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2494, 317, '5 ', '#E30328', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2495, 317, '16 ', '#913635', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2496, 317, '47 ', '#911932', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2497, 317, '81 ', '#BB0126', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2498, 317, '82 ', '#E0677A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2499, 317, '117 ', '#592323', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2500, 317, '136 ', '#F8516D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2501, 317, '148 ', '#F45C45', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2502, 317, '154 ', '#FCADB2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2503, 317, '204 ', '#D50527', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2504, 317, '211 ', '#F8C0A9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2505, 317, '245 ', '#E89B7D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2506, 317, '243 ', '#BE454A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2507, 317, '275 ', '#C69495', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2508, 317, '266 ', '#F2B8C6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2509, 317, '272 ', '#F7C3D0', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2510, 317, '264 ', '#EC806D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2511, 317, '283 ', '#E09DAF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2512, 317, '284 ', '#E84854', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2513, 317, '12 ', '#713D2F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2514, 317, '144 ', '#79544E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2515, 317, '199 ', '#A5452F', 0);

-- 系列: 绿 (30色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(318, 8, '绿', 4);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2516, 318, '73 ', '#B6DBAF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2517, 318, '157 ', '#63CEA2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2518, 318, '184 ', '#668575', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2519, 318, '23 ', '#32C958', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2520, 318, '235 ', '#7DCA9C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2521, 318, '57 ', '#D8FCA4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2522, 318, 'UNKNOWN-03 ', '#5EE88C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2523, 318, '257 ', '#96B69F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2524, 318, '33 ', '#64F343', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2525, 318, '26 ', '#9FF685', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2526, 318, '66 ', '#5FDF34', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2527, 318, '39 ', '#39E158', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2528, 318, '11 ', '#64E0A4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2529, 318, '44 ', '#3EAE7C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2530, 318, '10 ', '#1D9B54', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2531, 318, '79 ', '#2A5037', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2532, 318, '96 ', '#9AD1BA', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2533, 318, '106 ', '#1A6E3D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2534, 318, '128 ', '#C8E87D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2535, 318, '129 ', '#ACE84C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2536, 318, '130 ', '#305335', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2537, 318, '141 ', '#C0ED9C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2538, 318, '191 ', '#26B78E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2539, 318, '192 ', '#CAEDCF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2540, 318, '240 ', '#4E846D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2541, 318, '262 ', '#D0E0AF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2542, 318, '269 ', '#9EE5BB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2543, 318, '285 ', '#E3FBB1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2544, 318, '286 ', '#B2E694', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2545, 318, '287 ', '#92AD60', 0);

-- 系列: 青蓝 (51色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(319, 8, '青蓝', 5);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2546, 319, '193 ', '#ADCBF1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2547, 319, '183 ', '#337BAD', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2548, 319, '37 ', '#1D779C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2549, 319, '68 ', '#1960C8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2550, 319, '231 ', '#A3E7DC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2551, 319, '237 ', '#78CEE7', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2552, 319, '238 ', '#3FCDCE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2553, 319, '233 ', '#4E8379', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2554, 319, '58 ', '#91DAFB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2555, 319, '258 ', '#849DC6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2556, 319, '259 ', '#94BFE2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2557, 319, '207 ', '#176268', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2558, 319, '206 ', '#0A4241', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2559, 319, '30 ', '#ABF8FE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2560, 319, '63 ', '#9EE0F8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2561, 319, '77 ', '#44CDFB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2562, 319, '34 ', '#06ABE3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2563, 319, '25 ', '#54A7E9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2564, 319, '9 ', '#3977CC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2565, 319, '52 ', '#0F52BD', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2566, 319, '42 ', '#3349C3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2567, 319, '121 ', '#3DBBE3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2568, 319, '122 ', '#2ADED3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2569, 319, '120 ', '#1E334E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2570, 319, '140 ', '#CDE7FE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2571, 319, '139 ', '#D6FDFC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2572, 319, '143 ', '#21C5C4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2573, 319, '149 ', '#1858A2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2574, 319, '163 ', '#02D1F3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2575, 319, '196 ', '#213244', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2576, 319, '202 ', '#18869D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2577, 319, '197 ', '#1A70A9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2578, 319, '212 ', '#BEDDFC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2579, 319, '239 ', '#6BB1BB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2580, 319, '263 ', '#C8E2F9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2581, 319, '267 ', '#7EC5F9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2582, 319, '271 ', '#A9E8E0', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2583, 319, '265 ', '#42ADD1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2584, 319, '279 ', '#D0DEF9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2585, 319, '280 ', '#BDCEE8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2586, 319, '281 ', '#364A89', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2587, 319, '46 ', '#ACB7EF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2588, 319, '36 ', '#868DD3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2589, 319, '8 ', '#3653AF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2590, 319, '75 ', '#162C7E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2591, 319, '105 ', '#BCBAE2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2592, 319, '101 ', '#2F1E8E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2593, 319, '119 ', '#C7D3F9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2594, 319, '198 ', '#383995', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2595, 319, '244 ', '#768AE1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2596, 319, '249 ', '#4950C2', 0);

-- 系列: 黄 (25色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(320, 8, '黄', 6);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2597, 320, '65 ', '#FAF5CD', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2598, 320, '2 ', '#FCFED6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2599, 320, '28 ', '#FCFF92', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2600, 320, '3 ', '#F7EC5C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2601, 320, '74 ', '#F0D83A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2602, 320, '150 ', '#FBF65E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2603, 320, '216 ', '#FEFF97', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2604, 320, '270 ', '#EDF878', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2605, 320, '288 ', '#F3F6A9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2606, 320, '174 ', '#D0CBAE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2607, 320, '169 ', '#B0AA86', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2608, 320, '158 ', '#ECDB59', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2609, 320, '21 ', '#F8ED33', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2610, 320, '156 ', '#F8DA54', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2611, 320, '227 ', '#C8E664', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2612, 320, 'UNKNOWN-02 ', '#F1FA7D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2613, 320, '256 ', '#C1BD8D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2614, 320, '48 ', '#DFF139', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2615, 320, '97 ', '#627032', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2616, 320, '142 ', '#9EB33E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2617, 320, '147 ', '#E6ED4F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2618, 320, '205 ', '#343B1A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2619, 320, '222 ', '#E8FAA6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2620, 320, '268 ', '#C6DF5F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2621, 320, '145 ', '#F4EFD1', 0);

-- ==================================================
-- 清理旧数据（幂等）
DELETE FROM bead_colors WHERE series_id IN (SELECT id FROM bead_series WHERE brand_id = 7);
DELETE FROM bead_series WHERE brand_id = 7;
DELETE FROM bead_brands WHERE id = 7;

-- 咪小窝 (id=7, slug=mixiaowo)
-- ==================================================
INSERT INTO bead_brands(id, name, slug) VALUES(7, '咪小窝', 'mixiaowo');

-- 系列: 橙棕 (49色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(321, 7, '橙棕', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2622, 321, '29 ', '#FDA951', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2623, 321, '4 ', '#FA8C4F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2624, 321, '98 ', '#FDD94D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2625, 321, '97 ', '#F99C5F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2626, 321, '96 ', '#F47E36', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2627, 321, '109 ', '#FEDB99', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2628, 321, '110 ', '#FDA276', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2629, 321, '116 ', '#FEC667', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2630, 321, '213 ', '#FDE173', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2631, 321, '208 ', '#FCBF80', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2632, 321, '242 ', '#F9D66E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2633, 321, '261 ', '#FAE393', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2634, 321, '259 ', '#E1C9BD', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2635, 321, '274 ', '#FFD785', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2636, 321, '275 ', '#FEC832', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2637, 321, '167 ', '#E0D4BC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2638, 321, '170 ', '#A88764', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2639, 321, '160 ', '#C79266', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2640, 321, '63 ', '#EB903F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2641, 321, '185 ', '#F1E9D4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2642, 321, '182 ', '#FDC24E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2643, 321, '179 ', '#FDA42E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2644, 321, '22 ', '#FB852B', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2645, 321, '230 ', '#E3CCBA', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2646, 321, '221 ', '#A17140', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2647, 321, '219 ', '#F6BB6F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2648, 321, '60 ', '#FDB583', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2649, 321, 'ZG2 ', '#D6AA87', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2650, 321, '248 ', '#907C35', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2651, 321, '140 ', '#FAD4BF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2652, 321, '115 ', '#874628', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2653, 321, '246 ', '#D07E4A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2654, 321, '81 ', '#FFE4D3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2655, 321, '49 ', '#FCC6AC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2656, 321, '85 ', '#F1C4A5', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2657, 321, '19 ', '#DCB387', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2658, 321, '43 ', '#E7B34E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2659, 321, '50 ', '#E3A014', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2660, 321, '17 ', '#985C3A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2661, 321, '102 ', '#E4B685', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2662, 321, '101 ', '#DA8C42', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2663, 321, '118 ', '#DAC898', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2664, 321, '127 ', '#FEC993', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2665, 321, '114 ', '#B2714B', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2666, 321, '123 ', '#8B684C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2667, 321, '138 ', '#F2D8C1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2668, 321, '203 ', '#FFE4D6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2669, 321, '195 ', '#DD7D41', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2670, 321, '247 ', '#B38561', 0);

-- 系列: 灰白黑 (47色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(322, 7, '灰白黑', 1);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2671, 322, '168 ', '#BBC6B6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2672, 322, '172 ', '#909994', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2673, 322, '166 ', '#697E80', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2674, 322, '171 ', '#B0A796', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2675, 322, '164 ', '#C6B2BB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2676, 322, '173 ', '#644B51', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2677, 322, '163 ', '#747D7A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2678, 322, '51 ', '#FCFDFF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2679, 322, '62 ', '#F9F9F9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2680, 322, '69 ', '#ABABAB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2681, 322, '178 ', '#DBD9DA', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2682, 322, '190 ', '#E9EDEE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2683, 322, '151 ', '#FCECF7', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2684, 322, '157 ', '#D8D4D3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2685, 322, '152 ', '#56534E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2686, 322, 'UNKNOWN-04 ', '#F8F5FE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2687, 322, '76 ', '#F0FEE4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2688, 322, '126 ', '#E2E4F0', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2689, 322, '153 ', '#D8C2D9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2690, 322, '217 ', '#EADBF8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2691, 322, '206 ', '#FBF4EC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2692, 322, '205 ', '#F7E3EC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2693, 322, '241 ', '#D7C6CE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2694, 322, '235 ', '#937D8A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2695, 322, '143 ', '#F6F8E3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2696, 322, '15 ', '#FBFBFB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2697, 322, '1 ', '#FFFFFF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2698, 322, '13 ', '#B4B4B4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2699, 322, '83 ', '#878787', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2700, 322, '45 ', '#464648', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2701, 322, '70 ', '#2C2C2C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2702, 322, '14 ', '#010101', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2703, 322, '86 ', '#E7D6DC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2704, 322, '87 ', '#EFEDEE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2705, 322, '88 ', '#ECEAEB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2706, 322, '121 ', '#CDCDCD', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2707, 322, '144 ', '#FDF6EE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2708, 322, '145 ', '#CED7D4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2709, 322, '201 ', '#98A6A6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2710, 322, '200 ', '#1B1213', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2711, 322, '214 ', '#F0EEEF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2712, 322, '204 ', '#FCFFF8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2713, 322, '209 ', '#F2EEE5', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2714, 322, '236 ', '#96A09F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2715, 322, '276 ', '#F8FBE6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2716, 322, '277 ', '#CACAD2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2717, 322, '278 ', '#9B9C94', 0);

-- 系列: 紫 (35色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(323, 7, '紫', 2);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2718, 323, '161 ', '#9D7693', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2719, 323, '187 ', '#DBC7EA', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2720, 323, '24 ', '#F13484', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2721, 323, '56 ', '#945AB1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2722, 323, '229 ', '#D093BC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2723, 323, '223 ', '#9F85CF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2724, 323, '59 ', '#FF6FB7', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2725, 323, '61 ', '#E987EA', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2726, 323, 'UNKNOWN-01 ', '#F7D4E8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2727, 323, 'ZG7 ', '#E2A9D2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2728, 323, 'ZG8 ', '#AB91C0', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2729, 323, '32 ', '#B34EC6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2730, 323, '27 ', '#B37BDC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2731, 323, '7 ', '#8758A9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2732, 323, '89 ', '#E3D2FE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2733, 323, '90 ', '#D6BAF5', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2734, 323, '91 ', '#301A49', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2735, 323, '105 ', '#DC99CE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2736, 323, '106 ', '#B5038F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2737, 323, '107 ', '#882893', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2738, 323, '125 ', '#9A64B8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2739, 323, '155 ', '#9C34AD', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2740, 323, '158 ', '#940595', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2741, 323, '258 ', '#D6C6EB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2742, 323, '38 ', '#FCC1DD', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2743, 323, '74 ', '#F6BDE8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2744, 323, '6 ', '#E9639E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2745, 323, '40 ', '#F1559F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2746, 323, '41 ', '#C63674', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2747, 323, '95 ', '#E575C7', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2748, 323, '94 ', '#D33997', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2749, 323, '112 ', '#F893BF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2750, 323, '124 ', '#B5026A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2751, 323, '237 ', '#B58B9F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2752, 323, '267 ', '#DEBEE5', 0);

-- 系列: 红粉 (52色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(324, 7, '红粉', 3);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2753, 324, '135 ', '#F85842', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2754, 324, '218 ', '#FD7E77', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2755, 324, '162 ', '#AE8082', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2756, 324, '165 ', '#C37463', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2757, 324, '64 ', '#FEA2A3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2758, 324, '68 ', '#E79273', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2759, 324, '177 ', '#FEBDA7', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2760, 324, '186 ', '#FFDEE9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2761, 324, '180 ', '#FCBFD1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2762, 324, '188 ', '#E8BEC2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2763, 324, '189 ', '#DFAAA4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2764, 324, '181 ', '#A3656A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2765, 324, '52 ', '#D40E1F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2766, 324, '226 ', '#6B372C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2767, 324, '228 ', '#F3C6C0', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2768, 324, '220 ', '#C76A62', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2769, 324, '232 ', '#E58EAE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2770, 324, 'ZG1 ', '#DAABB3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2771, 324, '18 ', '#F6D4CB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2772, 324, '20 ', '#EC4072', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2773, 324, '103 ', '#FDDBE9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2774, 324, '131 ', '#F7DAD4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2775, 324, '139 ', '#F5C9CA', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2776, 324, '210 ', '#FBC8DB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2777, 324, '215 ', '#F6BBD1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2778, 324, '238 ', '#C09DA4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2779, 324, '35 ', '#FF9280', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2780, 324, '31 ', '#F73D4B', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2781, 324, '72 ', '#EF4D3E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2782, 324, '73 ', '#F92B40', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2783, 324, '5 ', '#E30328', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2784, 324, '16 ', '#913635', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2785, 324, '47 ', '#911932', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2786, 324, '92 ', '#BB0126', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2787, 324, '93 ', '#E0677A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2788, 324, '129 ', '#592323', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2789, 324, '134 ', '#F8516D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2790, 324, '148 ', '#F45C45', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2791, 324, '154 ', '#FCADB2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2792, 324, '191 ', '#D50527', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2793, 324, '211 ', '#F8C0A9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2794, 324, '245 ', '#E89B7D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2795, 324, '243 ', '#BE454A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2796, 324, '260 ', '#C69495', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2797, 324, '251 ', '#F2B8C6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2798, 324, '257 ', '#F7C3D0', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2799, 324, '249 ', '#EC806D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2800, 324, '268 ', '#E09DAF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2801, 324, '269 ', '#E84854', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2802, 324, '12 ', '#713D2F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2803, 324, '137 ', '#79544E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2804, 324, '199 ', '#A5452F', 0);

-- 系列: 绿 (30色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(325, 7, '绿', 4);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2805, 325, '66 ', '#B6DBAF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2806, 325, '65 ', '#63CEA2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2807, 325, '184 ', '#668575', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2808, 325, '23 ', '#32C958', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2809, 325, '222 ', '#7DCA9C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2810, 325, '57 ', '#D8FCA4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2811, 325, 'UNKNOWN-03 ', '#5EE88C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2812, 325, 'ZG4 ', '#96B69F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2813, 325, '33 ', '#64F343', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2814, 325, '26 ', '#9FF685', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2815, 325, '78 ', '#5FDF34', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2816, 325, '39 ', '#39E158', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2817, 325, '11 ', '#64E0A4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2818, 325, '44 ', '#3EAE7C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2819, 325, '10 ', '#1D9B54', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2820, 325, '84 ', '#2A5037', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2821, 325, '100 ', '#9AD1BA', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2822, 325, '111 ', '#1A6E3D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2823, 325, '119 ', '#C8E87D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2824, 325, '117 ', '#ACE84C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2825, 325, '122 ', '#305335', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2826, 325, '133 ', '#C0ED9C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2827, 325, '174 ', '#26B78E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2828, 325, '175 ', '#CAEDCF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2829, 325, '240 ', '#4E846D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2830, 325, '262 ', '#D0E0AF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2831, 325, '254 ', '#9EE5BB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2832, 325, '270 ', '#E3FBB1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2833, 325, '271 ', '#B2E694', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2834, 325, '272 ', '#92AD60', 0);

-- 系列: 青蓝 (52色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(326, 7, '青蓝', 5);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2835, 326, '176 ', '#ADCBF1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2836, 326, '183 ', '#337BAD', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2837, 326, '55 ', '#1EBA93', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2838, 326, '37 ', '#1D779C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2839, 326, '54 ', '#1960C8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2840, 326, '231 ', '#A3E7DC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2841, 326, '224 ', '#78CEE7', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2842, 326, '225 ', '#3FCDCE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2843, 326, '233 ', '#4E8379', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2844, 326, '58 ', '#91DAFB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2845, 326, 'ZG5 ', '#849DC6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2846, 326, 'ZG6 ', '#94BFE2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2847, 326, '194 ', '#176268', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2848, 326, '193 ', '#0A4241', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2849, 326, '30 ', '#ABF8FE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2850, 326, '75 ', '#9EE0F8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2851, 326, '82 ', '#44CDFB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2852, 326, '34 ', '#06ABE3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2853, 326, '25 ', '#54A7E9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2854, 326, '9 ', '#3977CC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2855, 326, '71 ', '#0F52BD', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2856, 326, '42 ', '#3349C3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2857, 326, '130 ', '#3DBBE3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2858, 326, '113 ', '#2ADED3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2859, 326, '120 ', '#1E334E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2860, 326, '142 ', '#CDE7FE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2861, 326, '136 ', '#D6FDFC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2862, 326, '132 ', '#21C5C4', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2863, 326, '149 ', '#1858A2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2864, 326, '156 ', '#02D1F3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2865, 326, '196 ', '#213244', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2866, 326, '202 ', '#18869D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2867, 326, '197 ', '#1A70A9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2868, 326, '212 ', '#BEDDFC', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2869, 326, '239 ', '#6BB1BB', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2870, 326, '263 ', '#C8E2F9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2871, 326, '252 ', '#7EC5F9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2872, 326, '256 ', '#A9E8E0', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2873, 326, '250 ', '#42ADD1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2874, 326, '264 ', '#D0DEF9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2875, 326, '265 ', '#BDCEE8', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2876, 326, '266 ', '#364A89', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2877, 326, '46 ', '#ACB7EF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2878, 326, '36 ', '#868DD3', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2879, 326, '8 ', '#3653AF', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2880, 326, '80 ', '#162C7E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2881, 326, '104 ', '#BCBAE2', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2882, 326, '108 ', '#2F1E8E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2883, 326, '128 ', '#C7D3F9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2884, 326, '198 ', '#383995', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2885, 326, '244 ', '#768AE1', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2886, 326, '234 ', '#4950C2', 0);

-- 系列: 黄 (25色)
INSERT INTO bead_series(id, brand_id, name, sort_order) VALUES(327, 7, '黄', 6);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2887, 327, '77 ', '#FAF5CD', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2888, 327, '2 ', '#FCFED6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2889, 327, '28 ', '#FCFF92', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2890, 327, '3 ', '#F7EC5C', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2891, 327, '79 ', '#F0D83A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2892, 327, '150 ', '#FBF65E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2893, 327, '216 ', '#FEFF97', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2894, 327, '255 ', '#EDF878', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2895, 327, '273 ', '#F3F6A9', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2896, 327, '159 ', '#D0CBAE', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2897, 327, '169 ', '#B0AA86', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2898, 327, '67 ', '#ECDB59', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2899, 327, '21 ', '#F8ED33', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2900, 327, '53 ', '#F8DA54', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2901, 327, '227 ', '#C8E664', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2902, 327, 'UNKNOWN-02 ', '#F1FA7D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2903, 327, 'ZG3 ', '#C1BD8D', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2904, 327, '48 ', '#DFF139', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2905, 327, '99 ', '#627032', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2906, 327, '141 ', '#9EB33E', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2907, 327, '147 ', '#E6ED4F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2908, 327, '192 ', '#343B1A', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2909, 327, '207 ', '#E8FAA6', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2910, 327, '253 ', '#C6DF5F', 0);
INSERT INTO bead_colors(id, series_id, name, hex, sort_order) VALUES(2911, 327, '146 ', '#F4EFD1', 0);

-- 总计新增: 712 色
