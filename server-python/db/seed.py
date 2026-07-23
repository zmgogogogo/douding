"""
珠子数据种子 — 从共用 douding.db 读取或从 Node.js seed 导入
Python 后端与 Node.js 共享同一个 SQLite 数据库，
正常情况下种子数据已由 Node.js 后端初始化。
"""


def seed_beads(conn):
    """
    确保珠子品牌/系列/颜色数据存在。

    与 Node.js 共享 douding.db，正常启动时数据已存在。
    仅在数据库为空时尝试填充（首次部署或重置场景）。
    """
    count = conn.execute("SELECT COUNT(*) FROM bead_brands").fetchone()[0]
    if count > 0:
        # 数据已存在，跳过（最常见路径）
        return

    print("[seed] 珠子数据为空，从 Node.js seed 数据导入...")
    _import_from_bundled_data(conn)
    conn.commit()

    final = conn.execute("SELECT COUNT(*) FROM bead_colors").fetchone()[0]
    print(f"[seed] 完成: {final} 种珠子颜色")


def _import_from_bundled_data(conn):
    """
    从内嵌的品牌/颜色数据填充数据库。

    数据来源与 Node.js seed.js 一致：
    8 大品牌 1900+ 种珠子颜色。
    此处内嵌精简版数据以保持文件体积可控，
    完整数据可从 Node.js 端导入。
    """
    brands = _get_brand_data()

    for brand in brands:
        conn.execute(
            "INSERT OR IGNORE INTO bead_brands (name, slug) VALUES (?, ?)",
            (brand["name"], brand["slug"])
        )
        brand_id = conn.execute(
            "SELECT id FROM bead_brands WHERE slug = ?", (brand["slug"],)
        ).fetchone()[0]

        for si, series in enumerate(brand["series"]):
            conn.execute(
                "INSERT OR IGNORE INTO bead_series (brand_id, name, sort_order) VALUES (?, ?, ?)",
                (brand_id, series["name"], si)
            )
            series_id = conn.execute(
                "SELECT id FROM bead_series WHERE brand_id = ? AND name = ?",
                (brand_id, series["name"])
            ).fetchone()[0]

            for ci, (color_name, hex_color) in enumerate(series["colors"]):
                # 预计算 Lab 值
                r = int(hex_color[1:3], 16)
                g = int(hex_color[3:5], 16)
                b = int(hex_color[5:7], 16)
                lab_l, lab_a, lab_b = _rgb_to_lab_simple(r, g, b)

                conn.execute(
                    """INSERT OR IGNORE INTO bead_colors
                       (series_id, name, hex, sort_order, lab_l, lab_a, lab_b)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (series_id, color_name, hex_color, ci, lab_l, lab_a, lab_b)
                )


def _rgb_to_lab_simple(r, g, b):
    """简化的 RGB → CIE Lab 转换（用于种子数据 Lab 值预计算）"""
    # sRGB 线性化
    def linearize(v):
        v = v / 255.0
        return ((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92

    rl, gl, bl = linearize(r), linearize(g), linearize(b)

    # RGB → XYZ (D65)
    x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) * 100
    y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) * 100
    z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) * 100

    # XYZ → Lab (D65)
    xn, yn, zn = 95.047, 100.000, 108.883

    def f(t):
        return t ** (1 / 3) if t > 0.008856 else (903.3 * t + 16) / 116

    fy = f(y / yn)
    L = max(0, 116 * fy - 16)
    a = 500 * (f(x / xn) - fy)
    b_val = 200 * (fy - f(z / zn))
    return round(L, 2), round(a, 2), round(b_val, 2)


def _get_brand_data():
    """
    内嵌品牌颜色数据（精简版，覆盖主流品牌核心颜色）。

    数据来源：
    - maxcleme/beadcolors (GitHub)
    - HansBug/pindou-color-data (GitHub)
    - Artkal 官方色卡
    """
    return [
        {
            "name": "Hama", "slug": "hama",
            "series": [
                {"name": "Classic 经典色", "colors": [
                    ["H01 White", "#E5ECF1"], ["H02 Cream", "#E4E4C5"],
                    ["H03 Yellow", "#E9C704"], ["H04 Orange", "#D14803"],
                    ["H05 Red", "#B4060E"], ["H06 Pink", "#EA8AA5"],
                    ["H07 Purple", "#712297"], ["H08 Blue", "#0239A3"],
                    ["H09 Light Blue", "#025BC3"], ["H10 Green", "#027643"],
                    ["H11 Light Green", "#19CDA7"], ["H12 Brown", "#3E271A"],
                    ["H17 Grey", "#838F98"], ["H18 Black", "#141315"],
                    ["H20 Reddish Brown", "#8D2A0F"], ["H21 Light Brown", "#BE6C21"],
                    ["H26 Matt Rose", "#E8A498"], ["H27 Beige", "#DCB18E"],
                    ["H31 Turquoise", "#489AB9"], ["H43 Pastel Yellow", "#E7E45A"],
                    ["H44 Pastel Red", "#F96160"], ["H45 Pastel Purple", "#8E69CD"],
                    ["H46 Pastel Blue", "#51AEE4"], ["H47 Pastel Green", "#80DF96"],
                    ["H48 Pastel Pink", "#D67AD1"], ["H70 Light Grey", "#A5B3C0"],
                    ["H71 Dark Grey", "#445059"],
                ]},
            ]
        },
        {
            "name": "Perler", "slug": "perler",
            "series": [
                {"name": "基础色", "colors": [
                    ["White", "#EAEFEE"], ["Black", "#323234"],
                    ["Red", "#B0353C"], ["Orange", "#EB7B31"],
                    ["Yellow", "#E7CE3E"], ["Green", "#4DAB64"],
                    ["Blue", "#0065B1"], ["Purple", "#684B86"],
                    ["Brown", "#674C44"], ["Grey", "#909497"],
                    ["Light Blue", "#278CC9"], ["Pink", "#D45496"],
                    ["Turquoise", "#0098C5"], ["Light Green", "#18C7B1"],
                    ["Dark Blue", "#0E5092"], ["Dark Green", "#007B4E"],
                    ["Pastel Blue", "#4A9CCF"], ["Pastel Green", "#6DCC94"],
                    ["Pastel Lavender", "#937FBF"], ["Pastel Yellow", "#E9E290"],
                ]},
            ]
        },
        {
            "name": "Artkal", "slug": "artkal",
            "series": [
                {"name": "S系列 5mm 硬豆（实色）", "colors": [
                    ["S01 White", "#EAEEF3"], ["S02 Burning Sand", "#EE927C"],
                    ["S03 Tangerine", "#FFA630"], ["S04 Orange", "#EB6027"],
                    ["S05 Tall Poppy", "#CB3531"], ["S06 Raspberry Pink", "#EF67B2"],
                    ["S07 Gray", "#959698"], ["S08 Emerald", "#1FC467"],
                    ["S09 Dark Green", "#00685E"], ["S10 Baby Blue", "#2EABD8"],
                    ["S11 Dark Blue", "#004FA4"], ["S12 Pastel Lavender", "#9165B2"],
                    ["S13 Black", "#292A2B"], ["S18 Sand", "#DCA384"],
                    ["S20 Green", "#009053"], ["S25 Hot Pink", "#DC519A"],
                    ["S27 Yellow", "#EAC125"], ["S34 Red", "#B61927"],
                ]},
            ]
        },
    ]
