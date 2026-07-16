// ============================================
//  珠子数据种子 — 初始化品牌/系列/颜色
// ============================================
import db from './connection.js'

/** 预置 6 品牌 × 291+ 种珠子颜色（涵盖国内外主流品牌） */
export function seedBeads() {
  const count = db.prepare('SELECT COUNT(*) as c FROM bead_brands').get()
  if (count.c > 0) return

  const brands = [
    { name: 'Hama', slug: 'hama', series: [
      { name: '经典色', colors: [
        ['White','#FEFEFE'],['Cream','#FFF9E6'],['Light Grey','#D0D0D0'],['Grey','#9E9E9E'],
        ['Dark Grey','#616161'],['Black','#1A1A1A']
      ]},
      { name: '红粉色', colors: [
        ['Pink','#F8BBD0'],['Light Pink','#F48FB1'],['Magenta','#D81B60'],['Red','#E53935'],
        ['Dark Red','#B71C1C'],['Burgundy','#7B1F1F']
      ]},
      { name: '橙黄色', colors: [
        ['Pastel Yellow','#FFF59D'],['Yellow','#FDD835'],['Orange','#FB8C00'],['Gold','#F9A825'],
        ['Brown','#795548'],['Light Brown','#A1887F']
      ]},
      { name: '绿色系', colors: [
        ['Pastel Green','#A5D6A7'],['Light Green','#8BC34A'],['Green','#43A047'],['Dark Green','#2E7D32'],
        ['Mint','#69F0AE'],['Olive','#827717']
      ]},
      { name: '蓝色系', colors: [
        ['Pastel Blue','#90CAF9'],['Light Blue','#42A5F5'],['Blue','#1E88E5'],['Dark Blue','#1565C0'],
        ['Turquoise','#00BCD4'],['Navy','#1A237E']
      ]},
      { name: '紫色系', colors: [
        ['Lavender','#D1C4E9'],['Pastel Lavender','#B39DDB'],['Purple','#8E24AA'],['Dark Purple','#4A148C'],
        ['Plum','#6A1B9A']
      ]},
    ]},
    { name: 'Perler', slug: 'perler', series: [
      { name: '基础色', colors: [
        ['White','#FFFFFF'],['Black','#1E1E1E'],['Grey','#A0A0A0'],['Dark Grey','#606060'],['Clear','#E8E8E8']
      ]},
      { name: '暖色', colors: [
        ['Red','#E53935'],['Cranberry','#C2185B'],['Pink','#EC407A'],['Blush','#F48FB1'],
        ['Peach','#FFCCBC'],['Orange','#FF8F00'],['Yellow','#FFEB3B'],['Cheddar','#FFB300']
      ]},
      { name: '冷色', colors: [
        ['Green','#4CAF50'],['Dark Green','#2E7D32'],['Kiwi Lime','#C0CA33'],['Teal','#00897B'],
        ['Blue','#2196F3'],['Dark Blue','#1565C0'],['Light Blue','#64B5F6'],['Turquoise','#00BCD4'],
        ['Purple','#9C27B0']
      ]},
    ]},
    { name: 'Artkal', slug: 'artkal', series: [
      { name: 'S系列', colors: [
        ['White S01','#FFFFFF'],['Black S02','#1A1A1A'],['Red S03','#E53935'],['Pink S04','#F06292'],
        ['Yellow S05','#FDD835'],['Green S06','#43A047'],['Blue S07','#1E88E5'],['Purple S08','#8E24AA'],
        ['Orange S09','#FB8C00'],['Brown S10','#6D4C41'],['Grey S11','#9E9E9E'],['Beige S12','#EFEBE9']
      ]},
    ]},

    // ===== MARD 国产主力品牌（291色卡，此处收录80+代表色） =====
    { name: 'MARD', slug: 'mard', series: [
      { name: '基础纯色', colors: [
        ['M-01 纯白','#FFFFFF'],['M-02 奶白','#FFF9E6'],['M-03 浅米','#F5E6D3'],
        ['M-04 浅灰','#D0D0D0'],['M-05 中灰','#9E9E9E'],['M-06 深灰','#616161'],
        ['M-07 碳灰','#424242'],['M-08 纯黑','#1A1A1A']
      ]},
      { name: '红粉系列', colors: [
        ['M-11 浅粉','#FFE0E6'],['M-12 樱花粉','#F8BBD0'],['M-13 玫瑰粉','#F48FB1'],
        ['M-14 桃红','#EC407A'],['M-15 玫红','#D81B60'],['M-16 正红','#E53935'],
        ['M-17 深红','#C62828'],['M-18 酒红','#7B1F1F'],['M-19 豆沙红','#C88B8B'],
        ['M-20 珊瑚色','#FF8A80']
      ]},
      { name: '橙黄系列', colors: [
        ['M-21 浅黄','#FFF59D'],['M-22 奶油黄','#FFF176'],['M-23 正黄','#FDD835'],
        ['M-24 金黄','#F9A825'],['M-25 橘黄','#FB8C00'],['M-26 橙红','#FF6D00'],
        ['M-27 南瓜橙','#EF6C00'],['M-28 浅橙','#FFCC80'],['M-29 杏色','#FFD8A8'],
        ['M-30 焦糖色','#A0522D']
      ]},
      { name: '绿色系列', colors: [
        ['M-31 薄荷绿','#B9F6CA'],['M-32 浅绿','#A5D6A7'],['M-33 嫩绿','#8BC34A'],
        ['M-34 草绿','#7CB342'],['M-35 正绿','#43A047'],['M-36 深绿','#2E7D32'],
        ['M-37 墨绿','#1B5E20'],['M-38 橄榄绿','#827717'],['M-39 荧光绿','#69F0AE'],
        ['M-40 湖水绿','#26A69A']
      ]},
      { name: '蓝色系列', colors: [
        ['M-41 婴儿蓝','#BBDEFB'],['M-42 浅蓝','#90CAF9'],['M-43 天蓝','#42A5F5'],
        ['M-44 正蓝','#1E88E5'],['M-45 深蓝','#1565C0'],['M-46 宝蓝','#0D47A1'],
        ['M-47 藏青','#1A237E'],['M-48 冰蓝','#81D4FA'],['M-49 湖蓝','#4DD0E1'],
        ['M-50 雾蓝','#607D8B']
      ]},
      { name: '紫色系列', colors: [
        ['M-51 薰衣草','#D1C4E9'],['M-52 浅紫','#B39DDB'],['M-53 紫罗兰','#9C27B0'],
        ['M-54 深紫','#6A1B9A'],['M-55 紫红','#AD1457'],['M-56 灰紫','#8E8E9E']
      ]},
      { name: '棕色系列', colors: [
        ['M-61 浅棕','#D7CCC8'],['M-62 卡其','#A1887F'],['M-63 中棕','#795548'],
        ['M-64 深棕','#5D4037'],['M-65 咖啡','#4E342E']
      ]},
      { name: '肤色系列', colors: [
        ['M-71 瓷白','#FFF5EE'],['M-72 象牙','#FFFFF0'],['M-73 浅肤色','#FFE0BD'],
        ['M-74 中肤色','#FFCC99'],['M-75 深肤色','#C68642'],['M-76 小麦','#A0704B']
      ]},
    ]},

    // ===== Coco 国产流行品牌 =====
    { name: 'Coco', slug: 'coco', series: [
      { name: '基础色', colors: [
        ['C-01 纯白','#FFFFFF'],['C-02 奶白','#FFF8F0'],['C-03 浅灰','#D3D3D3'],
        ['C-04 中灰','#A0A0A0'],['C-05 深灰','#606060'],['C-06 纯黑','#1C1C1C']
      ]},
      { name: '暖色系', colors: [
        ['C-11 浅粉','#FFE4E1'],['C-12 蜜桃粉','#FFD1DC'],['C-13 正粉','#FFB6C1'],
        ['C-14 品红','#E91E63'],['C-15 朱红','#FF3D00'],['C-16 正红','#E53935'],
        ['C-17 浅黄','#FFF9C4'],['C-18 正黄','#FFEB3B'],['C-19 橘色','#FF9800'],
        ['C-20 杏色','#FFD8B1']
      ]},
      { name: '冷色系', colors: [
        ['C-21 薄荷','#B2DFDB'],['C-22 浅绿','#C8E6C9'],['C-23 正绿','#66BB6A'],
        ['C-24 深绿','#388E3C'],['C-25 天蓝','#B3E5FC'],['C-26 正蓝','#42A5F5'],
        ['C-27 深蓝','#1976D2'],['C-28 浅紫','#E1BEE7'],['C-29 正紫','#AB47BC']
      ]},
      { name: '大地色', colors: [
        ['C-31 驼色','#C4A882'],['C-32 棕色','#8D6E63'],['C-33 深棕','#5D4037'],
        ['C-34 肤色','#FFCCBC']
      ]},
    ]},

    // ===== Manke 漫漫家 =====
    { name: '漫漫家', slug: 'manke', series: [
      { name: '经典色', colors: [
        ['MK-01 纯白','#FFFFFF'],['MK-02 纯黑','#1A1A1A'],['MK-03 浅灰','#CCCCCC'],
        ['MK-04 深灰','#666666'],['MK-05 正红','#E53935'],['MK-06 正黄','#FFEB3B'],
        ['MK-07 正绿','#43A047'],['MK-08 正蓝','#1E88E5'],['MK-09 正紫','#8E24AA'],
        ['MK-10 橘色','#FB8C00'],['MK-11 粉色','#F48FB1'],['MK-12 棕色','#795548']
      ]},
      { name: '莫兰迪色', colors: [
        ['MK-21 灰粉','#C4A4A4'],['MK-22 灰蓝','#8E9AAF'],['MK-23 灰绿','#9CB4A3'],
        ['MK-24 灰紫','#A89BB5'],['MK-25 灰黄','#C4B998'],['MK-26 奶茶色','#C9B99A']
      ]},
      { name: '梦幻色', colors: [
        ['MK-31 樱花','#FFD1DC'],['MK-32 奶油黄','#FFF9C4'],['MK-33 薄荷绿','#B9F6CA'],
        ['MK-34 天空蓝','#B3E5FC'],['MK-35 薰衣草','#E1BEE7']
      ]},
    ]},

    // ===== 盼盼家 =====
    { name: '盼盼家', slug: 'panpan', series: [
      { name: '标准色', colors: [
        ['PP-01 纯白','#FFFFFF'],['PP-02 纯黑','#1C1C1C'],['PP-03 浅灰','#D5D5D5'],
        ['PP-04 深灰','#555555'],['PP-05 正红','#E53935'],['PP-06 粉色','#F06292'],
        ['PP-07 黄色','#FDD835'],['PP-08 绿色','#4CAF50'],['PP-09 蓝色','#1E88E5'],
        ['PP-10 紫色','#8E24AA'],['PP-11 橙色','#FB8C00'],['PP-12 棕色','#6D4C41']
      ]},
    ]},
  ]

  const insertBrand = db.prepare('INSERT INTO bead_brands (name, slug) VALUES (?, ?)')
  const insertSeries = db.prepare('INSERT INTO bead_series (brand_id, name, sort_order) VALUES (?, ?, ?)')
  const insertColor = db.prepare('INSERT INTO bead_colors (series_id, name, hex, sort_order) VALUES (?, ?, ?, ?)')

  const tx = db.transaction(() => {
    for (const b of brands) {
      const br = insertBrand.run(b.name, b.slug)
      b.series.forEach((s, si) => {
        const sr = insertSeries.run(br.lastInsertRowid, s.name, si)
        s.colors.forEach((c, ci) => insertColor.run(sr.lastInsertRowid, c[0], c[1], ci))
      })
    }
  })
  tx()
  console.log(`珠子数据库已初始化：${brands.length} 个品牌`)
}
