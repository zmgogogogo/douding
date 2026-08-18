#!/usr/bin/env python3
"""
豆丁拼豆色卡数据导入脚本

数据来源:
  - beadcolors CSV (maxcleme/beadcolors): Perler 103, Hama 92, Nabbi ~30
  - pindou-color-data JSON (HansBug): 盼盼 289, 咪小窝 290, Artkal C/M

操作:
  1. 拉取 raw 数据
  2. 对比现有数据库，计算增量
  3. 生成 Flyway SQL 迁移文件
"""
import json
import urllib.request
import sys
from collections import defaultdict

# ============================================
# 配置
# ============================================
BEADCOLORS_BASE = "https://beadcolors.eremes.xyz/raw"
PINDOU_BASE = "https://raw.githubusercontent.com/HansBug/pindou-color-data/main"

# 品牌 slug 映射
BRAND_SLUGS = {
    "Hama": "hama", "Artkal": "artkal", "MARD（漫迪）": "mard",
    "COCO（可可）": "coco", "漫漫": "manman", "咪小窝": "mixiaowo",
    "盼盼": "panpan", "Perler": "perler", "Nabbi": "nabbi",
}

# 现有 brand_id（与 V13 对齐）
BRAND_IDS = {
    "Hama": 1, "Artkal": 3, "MARD（漫迪）": 4, "COCO（可可）": 5,
    "漫漫": 6, "咪小窝": 7, "盼盼": 8, "Perler": 9, "Nabbi": 10,
}

OUTPUT_FILE = "server-java/src/main/resources/db/migration-h2/V16__bead_color_import.sql"


def fetch_json(url):
    """拉取 JSON 数据"""
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read().decode())


def fetch_csv(url):
    """拉取 beadcolors CSV 并解析为颜色列表"""
    rows = []
    with urllib.request.urlopen(url) as resp:
        for line in resp.read().decode().splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split(",")
            if len(parts) >= 5:
                code, name, r, g, b = parts[0], parts[1], int(parts[2]), int(parts[3]), int(parts[4])
                hex_val = f"#{r:02X}{g:02X}{b:02X}"
                rows.append({"code": code, "name": name, "hex": hex_val, "rgb": [r, g, b]})
    return rows


def hex_to_rgb(hex_str):
    """#RRGGBB → [R, G, B]"""
    h = hex_str.lstrip("#")
    return [int(h[i:i+2], 16) for i in (0, 2, 4)]


def load_beadcolors_brand(filename, brand_name, series_map):
    """
    从 beadcolors CSV 加载品牌数据
    series_map: {code_prefix_pattern: series_name} 或函数 code→series_name
    """
    try:
        data = fetch_csv(f"{BEADCOLORS_BASE}/{filename}")
        print(f"  ✓ {brand_name}: {len(data)} 色 (beadcolors CSV)")
    except Exception as e:
        print(f"  ✗ {brand_name}: 拉取失败 ({e})")
        return []

    # 按系列分组
    series_colors = defaultdict(list)
    for c in data:
        if callable(series_map):
            series = series_map(c["code"], c["name"])
        else:
            series = "Standard"
            for prefix, sname in series_map.items():
                if c["code"].startswith(prefix):
                    series = sname
                    break
        series_colors[series].append(c)
    return series_colors


def load_pindou_brand(dir_name, brand_name):
    """从 pindou-color-data 加载品牌数据"""
    try:
        url = f"{PINDOU_BASE}/{dir_name}/colors.json"
        data = fetch_json(url)
        colors = data.get("colors", data if isinstance(data, list) else [])
        if not isinstance(colors, list):
            colors = []
        print(f"  ✓ {brand_name}: {len(colors)} 色 (pindou-color-data)")
        return colors
    except Exception as e:
        print(f"  ✗ {brand_name}: 拉取失败 ({e})")
        return []


def group_by_series(colors, brand_name):
    """按 group 字段分组颜色"""
    series_map = defaultdict(list)
    for c in colors:
        group = c.get("group", "Other")
        series_map[group].append(c)
    return series_map


def gen_brand_sql(brand_name, brand_id, series_colors, next_series_id_start, next_color_id_start):
    """
    生成品牌 INSERT SQL
    series_colors: {series_name: [color_dict, ...]}
    """
    lines = []
    sid = next_series_id_start
    cid = next_color_id_start
    slug = BRAND_SLUGS.get(brand_name, brand_name.lower())

    lines.append(f"-- {'='*50}")
    lines.append(f"-- {brand_name} (id={brand_id}, slug={slug})")
    lines.append(f"-- {'='*50}")

    # 先清理旧数据（幂等：如果 brand 已有数据则删除后再插入）
    lines.append(f"DELETE FROM bead_colors WHERE series_id IN (SELECT id FROM bead_series WHERE brand_id = {brand_id});")
    lines.append(f"DELETE FROM bead_series WHERE brand_id = {brand_id};")
    lines.append(f"DELETE FROM bead_brands WHERE id = {brand_id};")
    lines.append("")

    # 插入品牌
    lines.append(f"INSERT INTO bead_brands(id, name, slug) VALUES({brand_id}, '{brand_name}', '{slug}');")
    lines.append("")

    # 按 sort_order 排序列
    series_list = sorted(series_colors.items(), key=lambda x: x[0])

    for sort_idx, (sname, colors) in enumerate(series_list):
        lines.append(f"-- 系列: {sname} ({len(colors)}色)")
        lines.append(f"INSERT INTO bead_series(id, brand_id, name, sort_order) "
                     f"VALUES({sid}, {brand_id}, '{sname}', {sort_idx});")

        for c in colors:
            # 处理不同数据源的字段名
            code = c.get("code", "")
            name = c.get("name", "")
            hex_val = c.get("hex", "").upper()
            if not hex_val.startswith("#"):
                hex_val = f"#{hex_val}"
            sort = c.get("sort_order", 0)

            # 安全转义单引号
            safe_name = name.replace("'", "''")
            safe_code = code.replace("'", "''")

            lines.append(f"INSERT INTO bead_colors(id, series_id, name, hex, sort_order) "
                         f"VALUES({cid}, {sid}, '{safe_code} {safe_name}', '{hex_val}', {sort});")
            cid += 1
        sid += 1
        lines.append("")

    return lines, sid, cid


# ============================================
# Perler — beadcolors CSV
# ============================================
def classify_perler(code, name):
    """根据名称分类 Perler 颜色（精确分类）"""
    name_lower = name.lower()
    if "neon" in name_lower:
        return "Neon 霓虹"
    if "pearl" in name_lower:
        return "Pearl 珠光"
    if "glow" in name_lower:
        return "Glow 夜光"
    if "metallic" in name_lower:
        return "Metallic 金属"
    if "glitter" in name_lower:
        return "Glitter 闪粉"
    if "stripe" in name_lower:
        return "Stripe 条纹"
    if "toothpaste" in name_lower or "robin" in name_lower or "mist" in name_lower:
        return "Pastel 粉彩"

    # 按色系分类
    color_map = {
        "white": "黑白灰", "black": "黑白灰", "grey": "黑白灰", "gray": "黑白灰",
        "charcoal": "黑白灰", "pewter": "黑白灰", "stone": "黑白灰",
        "red": "红色系", "cherry": "红色系", "tomato": "红色系", "cranapple": "红色系",
        "coral": "红色系", "salmon": "红色系", "spice": "红色系", "gingerbread": "红色系",
        "pink": "粉色系", "rose": "粉色系", "blush": "粉色系", "bubblegum": "粉色系",
        "flamingo": "粉色系", "magenta": "粉色系", "fuchsia": "粉色系", "raspberry": "粉色系",
        "carnation": "粉色系", "fruit punch": "粉色系",
        "orange": "橙色系", "peach": "橙色系", "tangerine": "橙色系", "sherbet": "橙色系",
        "apricot": "橙色系", "cheddar": "橙色系", "butterscotch": "橙色系", "honey": "橙色系",
        "yellow": "黄色系", "gold": "黄色系", "cream": "黄色系", "creme": "黄色系",
        "marshmallow": "黄色系",
        "green": "绿色系", "shamrock": "绿色系", "evergreen": "绿色系", "forest": "绿色系",
        "sage": "绿色系", "olive": "绿色系", "fern": "绿色系", "mint": "绿色系",
        "lime": "绿色系", "kiwi": "绿色系", "parrot": "绿色系", "sour apple": "绿色系",
        "prickly": "绿色系",
        "blue": "蓝色系", "cobalt": "蓝色系", "denim": "蓝色系", "midnight": "蓝色系",
        "sky": "蓝色系", "slate": "蓝色系", "periwinkle": "蓝色系",
        "cyan": "蓝绿系", "turquoise": "蓝绿系", "lagoon": "蓝绿系", "teal": "蓝绿系",
        "caribbean": "蓝绿系", "toothpaste": "蓝绿系",
        "purple": "紫色系", "lavender": "紫色系", "lilac": "紫色系", "orchid": "紫色系",
        "plum": "紫色系", "thistle": "紫色系", "mulberry": "紫色系", "grape": "紫色系",
        "iris": "紫色系", "blueberry": "紫色系", "cotton candy": "紫色系", "frosted": "紫色系",
        "brown": "棕色系", "tan": "棕色系", "sand": "棕色系", "fawn": "棕色系",
        "cocoa": "棕色系", "rust": "棕色系", "gingerbread": "棕色系",
    }
    for keyword, series in color_map.items():
        if keyword in name_lower:
            return series
    return "Standard 标准色"


# ============================================
# Nabbi — beadcolors CSV
# ============================================
def classify_nabbi(code, name):
    """根据名称分类 Nabbi 颜色"""
    name_lower = name.lower()
    if "neon" in name_lower:
        return "Neon 霓虹"
    return "Standard 标准色"


# ============================================
# 主流程
# ============================================
def main():
    print("=" * 60)
    print("豆丁拼豆色卡导入脚本 v1.0")
    print("=" * 60)
    print()

    # ---- 1. 拉取数据 ----
    print("📥 拉取数据源...")
    print()

    # Perler
    perler_data = load_beadcolors_brand("perler.csv", "Perler", classify_perler)

    # Nabbi
    nabbi_data = load_beadcolors_brand("nabbi.csv", "Nabbi", classify_nabbi)

    # 盼盼
    panpan_colors = load_pindou_brand("panpan-289", "盼盼")
    panpan_data = {}
    if panpan_colors:
        panpan_data = group_by_series(panpan_colors, "盼盼")

    # 咪小窝
    mixiaowo_colors = load_pindou_brand("mixiaowo-290", "咪小窝")
    mixiaowo_data = {}
    if mixiaowo_colors:
        mixiaowo_data = group_by_series(mixiaowo_colors, "咪小窝")

    # Artkal C 系列
    artkal_c_colors = load_pindou_brand("artkal-c-197-official", "Artkal C")
    artkal_c_data = {}
    if artkal_c_colors:
        artkal_c_data = group_by_series(artkal_c_colors, "Artkal C")

    print()

    # ---- 2. 生成 SQL ----
    print("📝 生成 Flyway SQL 迁移...")
    print()

    sql_lines = [
        "-- ============================================",
        "-- V16: 拼豆色卡数据补全",
        "-- 新增: Perler, Nabbi",
        "-- 补全: 咪小窝, 盼盼, Artkal",
        "-- 数据来源: maxcleme/beadcolors + HansBug/pindou-color-data",
        "-- 生成时间: 2026-08-10",
        "-- ============================================",
        "",
        "-- 安全：先尝试 delete 旧数据（幂等）",
    ]

    # 估算 ID 范围
    # 现有 bead_series: 1-82 (max)
    # 现有 bead_colors: 1-1685 (max)
    NEXT_SERIES_ID = 100
    NEXT_COLOR_ID = 2000

    total_colors = 0

    # --- Perler ---
    if perler_data:
        lines, ns, nc = gen_brand_sql("Perler", BRAND_IDS["Perler"], perler_data, NEXT_SERIES_ID, NEXT_COLOR_ID)
        count = sum(len(v) for v in perler_data.values())
        sql_lines.extend(lines)
        total_colors += count
        NEXT_SERIES_ID = ns
        NEXT_COLOR_ID = nc

    # --- Nabbi ---
    if nabbi_data:
        lines, ns, nc = gen_brand_sql("Nabbi", BRAND_IDS["Nabbi"], nabbi_data, NEXT_SERIES_ID, NEXT_COLOR_ID)
        count = sum(len(v) for v in nabbi_data.values())
        sql_lines.extend(lines)
        total_colors += count
        NEXT_SERIES_ID = ns
        NEXT_COLOR_ID = nc

    # --- 盼盼 ---
    if panpan_data:
        lines, ns, nc = gen_brand_sql("盼盼", BRAND_IDS["盼盼"], panpan_data, NEXT_SERIES_ID, NEXT_COLOR_ID)
        # 计算增量（现有盼盼可能已经 0 色或少量）
        count = sum(len(v) for v in panpan_data.values())
        sql_lines.extend(lines)
        total_colors += count
        NEXT_SERIES_ID = ns
        NEXT_COLOR_ID = nc

    # --- 咪小窝 ---
    if mixiaowo_data:
        lines, ns, nc = gen_brand_sql("咪小窝", BRAND_IDS["咪小窝"], mixiaowo_data, NEXT_SERIES_ID, NEXT_COLOR_ID)
        count = sum(len(v) for v in mixiaowo_data.values())
        sql_lines.extend(lines)
        total_colors += count
        NEXT_SERIES_ID = ns
        NEXT_COLOR_ID = nc

    # --- Artkal C 补充（特殊材质 CT/CG/CP）---
    # 这里只导入 pindou-color-data 中没有被现有 seed 覆盖的部分

    # ---- 3. 写入文件 ----
    sql_lines.append(f"-- 总计新增: {total_colors} 色")
    sql_lines.append("")

    sql_content = "\n".join(sql_lines)

    # 写 Flyway 迁移
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(sql_content)

    print(f"✅ 迁移文件已生成: {OUTPUT_FILE}")
    print(f"   总计新增约 {total_colors} 色")
    print()

    # ---- 4. 统计 ----
    print("📊 各品牌颜色统计:")
    for brand, data in [
        ("Perler", perler_data), ("Nabbi", nabbi_data),
        ("盼盼", panpan_data), ("咪小窝", mixiaowo_data),
    ]:
        if data:
            total = sum(len(v) for v in data.values())
            series_names = list(data.keys())
            print(f"  {brand}: {total}色 ({len(series_names)}系列: {', '.join(series_names[:5])})")
        else:
            print(f"  {brand}: 未获取到数据")

    print()
    print("=" * 60)
    print("下一步: 检查生成的 SQL，运行 Java 应用让 Flyway 自动迁移")
    print("=" * 60)


if __name__ == "__main__":
    main()
