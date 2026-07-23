# 豆丁 (Douding) 仓库功能优化方案

> 编写日期：2026-07-16  
> 基于竞争对手调研与现有代码分析  
> 技术栈：Vue 3 + Express + SQLite (better-sqlite3)

---

## 目录

1. [竞品调研总结](#1-竞品调研总结)
2. [现有代码分析](#2-现有代码分析)
3. [数据库表设计](#3-数据库表设计)
4. [API 端点设计](#4-api-端点设计)
5. [前端 UI 方案](#5-前端-ui-方案)
6. [核心功能设计详述](#6-核心功能设计详述)
7. [实施路线图](#7-实施路线图)

---

## 1. 竞品调研总结

### 1.1 我嘞个豆 (ohmybead.cn)

**核心库存功能**：

| 功能     | 描述                                        |
| -------- | ------------------------------------------- |
| 扫码录入 | 扫描拼豆包装条形码快速录入豆子和数量        |
| 手动录入 | 支持手动输入色号记录库存                    |
| 库存对比 | 实时显示各颜色剩余量，清晰区分多与少        |
| 一键扣除 | 拼图完成后自动扣除所用豆子数量              |
| 多端同步 | 登录后 Web / iOS / Android 库存数据云端同步 |
| 库存追溯 | 可追溯每笔豆子是从哪个设计消耗的            |

**UX 亮点**：编辑器画完图后直接弹出「消耗确认」弹窗，列出所用颜色及数量，确认后从库存原子扣除。

### 1.2 拼豆仓库 (iOS)

**核心功能**：

- 多品牌独立管理（MARD / Coco / 漫漫家等各自独立仓库）
- CSV 批量导入库存
- 预入库/预出库（运输中订单管理）
- AI 智能识图辅助入库出库
- 操作记录全程可追溯，支持编辑删除修正
- 单图出库 / 整计划出库，出库前全量预检

**UX 亮点**：出库时关联图纸缩略图+名称，追溯一目了然；下次做同款可直接从出库记录一键出库。

### 1.3 拼豆大王 (内测中)

**核心功能**：

- 自定义预警阈值，库存不足时界面直接提示
- 基于「拼豆计划」自动对比库存，计算缺口色号
- 一键生成补豆清单，支持一键复制发给卖家
- 「运输中」模块记录已购未到货订单
- 按份数向上取整计算采购量（如 10g/份）

**UX 亮点**：「库存 + 运输中 - 消耗」三态汇总视图，一眼看清实际可用量。

### 1.4 啃豆小仓 & 算豆

**核心功能**：

- 自定义标签管理豆子分类
- 消耗统计排行（按时间段）
- 图纸上传自动计算缺口
- 品牌/时间双筛选仪表盘

**UX 亮点**：色系分组展示（A/B/C 系列），列表视图和网格视图双模式。

### 1.5 AI豆仓

**核心功能**：

- 全生命周期闭环：图纸上传 → 消耗计算 → 出库扣除 → 补货建议
- 智能补货助手，按历史消耗数据给出补货量建议
- 关联设计出库，全量原子扣减防错

### 1.6 竞品对比总结

| 功能          | ohmybead | 拼豆仓库 | 拼豆大王 | 啃豆小仓 | AI豆仓 |
| ------------- | :------: | :------: | :------: | :------: | :----: |
| 扫码录入      |    O     |    X     |    X     |    X     |   X    |
| 手动录入      |    O     |    O     |    O     |    O     |   O    |
| 库存对比      |    O     |    O     |    O     |    O     |   O    |
| 一键扣除      |    O     |    O     |    O     |    O     |   O    |
| 多端同步      |    O     |    X     |    X     |    X     |   X    |
| 库存追溯      |    O     |    O     |    O     |    O     |   O    |
| 预入库/运输中 |    X     |    O     |    O     |    X     |   X    |
| 预警阈值      |    X     |    O     |    O     |    O     |   O    |
| 补豆清单      |    X     |    O     |    O     |    O     |   O    |
| AI 识图       |    X     |    O     |    X     |    X     |   O    |
| CSV 导入      |    X     |    O     |    X     |    X     |   X    |
| 消耗统计      |    X     |    O     |    O     |    O     |   O    |

**我们的差异化机会**：

1. ohmybead 有多端同步但没有补豆管理 —— 我们可以在 Web 端做补豆提醒 + 采购清单
2. 拼豆仓库功能最全但是收费 App —— 我们 Web 免费可触达更多用户
3. 所有竞品都没有「根据待做图纸自动生成缺货清单」的完整体验
4. 我们可以利用已有设计数据做「设计消耗历史统计」，这是独特数据资产

---

## 2. 现有代码分析

### 2.1 现状总览

当前仓库模块极其简陋，仅实现了基础库存数量记录，缺乏完整的入库/出库/消耗/补豆流程。

### 2.2 现有 SQLite 表结构问题

**user_bead_inventory 表**（当前唯一库存相关表）：

```sql
CREATE TABLE user_bead_inventory (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  color_id INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, color_id)
);
```

**缺陷**：

- 只存最终数量，无任何操作日志（谁、何时、做了什么、原因）
- 无法区分「新买的」vs「消耗掉的」vs「手动调整的」
- 不关联设计，无法追溯消耗来源
- 无预警阈值字段
- 无入库/运输中状态字段
- `updated_at` 只在写入时更新，无法反映历史

### 2.3 现有 API 分析 (inventory.js)

**GET /api/inventory** — 获取库存列表

- 仅返回 quantity > 0 的项
- 不会返回库存为 0 但用户「关心」的色号（如常买但已用完的）

**POST /api/inventory** — 设置库存数量

- 仅接受 `colorId` + `quantity`
- 使用 upsert 直接覆盖数量
- **问题**：无法区分操作类型（入库/消耗/调整），所有操作都是「设置为某数量」

### 2.4 现有前端分析 (WarehouseView.vue)

**当前功能**：

- 文件夹侧边栏 + 设计列表
- 只有「新建文件夹」按钮
- 完全没有库存管理入口

### 2.5 useBeads.js 分析

仅提供珠子颜色数据加载，不涉及库存。需要扩展以支持库存状态查询。

---

## 3. 数据库表设计

### 3.1 修改现表：user_bead_inventory

新增字段以满足预警和状态管理：

```sql
CREATE TABLE IF NOT EXISTS user_bead_inventory (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  color_id   INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
  quantity   INTEGER DEFAULT 0,                          -- 当前可用库存（实际在手数量）
  min_threshold INTEGER DEFAULT 0,                       -- 【新增】库存预警阈值（用户自定义，0=不预警）
  transit_quantity INTEGER DEFAULT 0,                    -- 【新增】运输中（已购未到货）
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, color_id)
);
```

**字段说明**：

- `quantity`：当前实际可用的珠子数量，出库后扣减
- `min_threshold`：用户自定义的低库存线，低于此值触发补豆提醒
- `transit_quantity`：已购买但未到货的数量，不参与可用计算但展示给用户

### 3.2 新增表：inventory_logs（库存操作日志）

核心表，记录所有库存变动操作，实现完整追溯。

```sql
CREATE TABLE IF NOT EXISTS inventory_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  color_id    INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK(action IN ('inbound','outbound','adjust','transit_in','transit_arrive')),
  -- 操作类型：
  --   'inbound'        — 入库（新买豆子到了）
  --   'outbound'       — 出库（做设计消耗了豆子）
  --   'adjust'         — 手动调整（盘点修正）
  --   'transit_in'     — 标记为运输中（已下单）
  --   'transit_arrive' — 运输中到货确认
  quantity    INTEGER NOT NULL,                          -- 变动数量（正数=增加，负数=减少）
  balance_after INTEGER NOT NULL,                        -- 操作后当前可用余额
  source_type TEXT,                                      -- 来源类型：'design'|'manual'|'purchase'|'csv_import'
  source_id   INTEGER,                                   -- 来源 ID（关联 designs.id 或 purchase_lists.id）
  source_name TEXT,                                      -- 来源名称（如设计标题，方便直接展示）
  note        TEXT DEFAULT '',                           -- 用户备注
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_user ON inventory_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_color ON inventory_logs(color_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_user_color ON inventory_logs(user_id, color_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created ON inventory_logs(created_at);
```

**关键设计**：

- `source_type` + `source_id`：关联到具体设计或采购清单，实现「这个豆子是做哪个设计用掉的」追溯
- `balance_after`：记录操作后余额，便于审计核对
- `action` 使用 CHECK 约束保证数据完整性
- 不支持 UPDATE/DELETE（不可变日志），需要修正时插入一条新的 `adjust` 记录

### 3.3 新增表：purchase_lists（采购清单）

```sql
CREATE TABLE IF NOT EXISTS purchase_lists (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                             -- 清单名称（如"3月补豆清单"）
  status      TEXT DEFAULT 'draft' CHECK(status IN ('draft','ordered','arrived','cancelled')),
  -- 状态：'draft'=草稿, 'ordered'=已下单, 'arrived'=已到货, 'cancelled'=已取消
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_list_id INTEGER NOT NULL REFERENCES purchase_lists(id) ON DELETE CASCADE,
  color_id        INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
  need_quantity   INTEGER NOT NULL,                      -- 需要的总数量
  current_stock   INTEGER NOT NULL,                      -- 当前库存（快照，方便回溯）
  gap_quantity    INTEGER NOT NULL,                      -- 缺口数量 = need - current（快照）
  suggest_buy     INTEGER NOT NULL,                      -- 建议购买数量（按份向上取整）
  unit_size       INTEGER DEFAULT 1000,                  -- 每份多少颗（如 1000 颗/份）
  is_bought       INTEGER DEFAULT 0,                     -- 是否已购买
  created_at      TEXT DEFAULT (datetime('now'))
);
```

**设计思路**：

- 生成清单时快照 `current_stock` 和 `gap_quantity`，避免后续库存变化导致数据不一致
- `suggest_buy` 按 `unit_size` 向上取整，如缺口 350 颗，每份 1000 颗，建议买 1 份（1000 颗）

### 3.4 新增表：design_bead_usage（设计消耗记录）

记录每个设计消耗的珠子明细，用于「这个设计用了哪些豆子」的追溯。

```sql
CREATE TABLE IF NOT EXISTS design_bead_usage (
  design_id   INTEGER NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  color_id    INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
  bead_count  INTEGER NOT NULL,                          -- 该设计消耗该颜色的数量
  PRIMARY KEY (design_id, color_id)
);
```

### 3.5 完整 ER 关系图

```
users ──1:N──> user_bead_inventory ──N:1──> bead_colors
  │                  │
  │                  └──1:N──> inventory_logs ──N:1──> bead_colors
  │
  ├──1:N──> designs ──1:N──> design_bead_usage ──N:1──> bead_colors
  │
  ├──1:N──> purchase_lists ──1:N──> purchase_items ──N:1──> bead_colors
  │
  └──1:N──> folders
```

---

## 4. API 端点设计

所有端点前缀 `/api`，响应格式遵循项目规范：`{ code: 200, data: ... }` 成功，`{ code: 4xx|5xx, message: "..." }` 错误。

### 4.1 库存管理

| 方法 | 路由                              | 认证 | 说明                                                                                    |
| ---- | --------------------------------- | :--: | --------------------------------------------------------------------------------------- |
| GET  | /api/inventory                    |  是  | **增强**：返回所有库存项（含 quantity=0 的），增加 min_threshold、transit_quantity 字段 |
| GET  | /api/inventory/colors             |  是  | 获取所有珠子颜色及其库存状态（含 inventory 字段，编辑器调色板用）                       |
| POST | /api/inventory                    |  是  | **重构**：入库或手动调整，自动写入 inventory_logs                                       |
| POST | /api/inventory/consumption        |  是  | 根据设计 gridData 消耗豆子（关联 design_id）                                            |
| POST | /api/inventory/batch              |  是  | 批量入库/出库（CSV 导入等批量场景）                                                     |
| PUT  | /api/inventory/:colorId/threshold |  是  | 设置某颜色的预警阈值                                                                    |
| POST | /api/inventory/csv-import         |  是  | CSV 文件导入库存                                                                        |

**GET /api/inventory 增强响应示例**：

```json
{
  "code": 200,
  "data": [
    {
      "color_id": 12,
      "name": "M-16 正红",
      "hex": "#E53935",
      "brand": "MARD",
      "series": "红粉系列",
      "quantity": 1500,
      "min_threshold": 500,
      "transit_quantity": 1000,
      "status": "sufficient", // sufficient|low|empty
      "updated_at": "2026-07-15 10:30:00"
    }
  ]
}
```

**GET /api/inventory/colors 响应示例**（编辑器面板所用）：

```json
{
  "code": 200,
  "data": {
    "MARD": [
      {
        "series": "红粉系列",
        "colors": [
          {
            "id": 70,
            "name": "M-16 正红",
            "hex": "#E53935",
            "inventory": 1500,
            "status": "sufficient"
          }
        ]
      }
    ]
  }
}
```

### 4.2 库存日志

| 方法 | 路由                         | 认证 | 说明                                                                   |
| ---- | ---------------------------- | :--: | ---------------------------------------------------------------------- |
| GET  | /api/inventory/logs          |  是  | 获取操作日志（支持 color_id、action、source_type、日期范围筛选，分页） |
| GET  | /api/inventory/logs/:colorId |  是  | 某颜色的操作历史                                                       |

**查询参数**：

- `color_id` — 按颜色筛选
- `action` — 按操作类型筛选
- `source_type` — 按来源类型筛选
- `from` / `to` — 日期范围
- `page` / `limit` — 分页

### 4.3 消耗追踪

| 方法 | 路由                           | 认证 | 说明                                           |
| ---- | ------------------------------ | :--: | ---------------------------------------------- |
| GET  | /api/inventory/usage           |  是  | 消耗统计（按时间段、按颜色、按设计的聚合数据） |
| GET  | /api/inventory/usage/:designId |  是  | 某设计消耗的珠子明细                           |
| GET  | /api/inventory/usage/colors    |  是  | 各颜色消耗排行（Top N 最常用色）               |

### 4.4 采购清单

| 方法   | 路由                                    | 认证 | 说明                                                           |
| ------ | --------------------------------------- | :--: | -------------------------------------------------------------- |
| POST   | /api/purchase-lists                     |  是  | 创建采购清单                                                   |
| GET    | /api/purchase-lists                     |  是  | 获取我的所有采购清单列表                                       |
| GET    | /api/purchase-lists/:id                 |  是  | 采购清单详情（含 items）                                       |
| PUT    | /api/purchase-lists/:id                 |  是  | 更新清单状态（标记已下单/已到货）                              |
| DELETE | /api/purchase-lists/:id                 |  是  | 删除清单                                                       |
| POST   | /api/purchase-lists/generate            |  是  | **核心**：根据指定设计 ID 列表或全部待做设计，自动生成缺货清单 |
| POST   | /api/purchase-lists/:id/confirm-arrival |  是  | 确认到货，自动转入 inventory_logs 并更新库存                   |

**POST /api/purchase-lists/generate 请求参数**：

```json
{
  "design_ids": [1, 3, 5], // 指定设计 ID，不传则使用用户标记为"待做"的所有设计
  "unit_size": 1000, // 每份多少颗，默认 1000
  "check_transit": true // 是否将「运输中」数量也纳入计算
}
```

**响应**：自动计算出每个颜色 `need_quantity`（设计所需）、`current_stock`（当前库存快照）、`gap_quantity`（缺口）、`suggest_buy`（按份建议），并返回可一键生成的清单数据。

### 4.5 补豆提醒

| 方法 | 路由                        | 认证 | 说明                                  |
| ---- | --------------------------- | :--: | ------------------------------------- |
| GET  | /api/inventory/alerts       |  是  | 获取库存预警列表（库存 ≤ 阈值的颜色） |
| GET  | /api/inventory/alerts/count |  是  | 预警数量（用于导航栏小红点）          |

### 4.6 统计仪表盘

| 方法 | 路由                            | 认证 | 说明                                             |
| ---- | ------------------------------- | :--: | ------------------------------------------------ |
| GET  | /api/inventory/stats            |  是  | 库存总览统计（总色号数、总豆数、空仓数、低仓数） |
| GET  | /api/inventory/stats/trend      |  是  | 消耗趋势（按月统计消耗量）                       |
| GET  | /api/inventory/stats/top-colors |  是  | Top 消耗颜色排行                                 |

### 4.7 操作日志查询接口

**GET /api/inventory/logs 响应示例**：

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 42,
        "action": "outbound",
        "color_id": 70,
        "color_name": "M-16 正红",
        "color_hex": "#E53935",
        "quantity": -200,
        "balance_after": 1300,
        "source_type": "design",
        "source_id": 15,
        "source_name": "皮卡丘像素画",
        "note": "",
        "created_at": "2026-07-14 15:30:00"
      }
    ],
    "total": 128,
    "page": 1,
    "limit": 20
  }
}
```

---

## 5. 前端 UI 方案

### 5.1 WarehouseView 整体改造

将现有 WarehouseView（仅文件夹+设计列表）改造为多标签页布局的「我的仓库」主面板。

#### 布局结构

```
┌────────────────────────────────────────────────┐
│  我的仓库           [库存] [图纸] [清单] [统计] │  ← 顶部 Tab 导航
├────────────────────────────────────────────────┤
│                                                │
│  ┌─ 侧栏 ─┐  ┌──────── 内容区 ─────────────┐  │
│  │         │  │                              │  │
│  │ 品牌筛选│  │  （根据 Tab 切换不同内容）    │  │
│  │ 系列筛选│  │                              │  │
│  │ 预警状态│  │                              │  │
│  │         │  │                              │  │
│  └─────────┘  └──────────────────────────────┘  │
│                                                │
└────────────────────────────────────────────────┘
```

#### Tab 1：「库存」— 库存管理主视图

**功能区域**：

```
┌─────────────────────────────────────────────────────────┐
│  [🔍 搜索色号/名称]  [+ 入库]  [📋 批量操作]  [🔔 3种待补] │  ← 顶部操作栏
├─────────────────────────────────────────────────────────┤
│  统计条：共 45 色号 | 总量 18500 颗 | 🟢 充足 30 | 🟡 低仓 12 | 🔴 空仓 3 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ 库存列表（品牌分组，可折叠）─────────────────────┐  │
│  │                                                    │  │
│  │ ▼ MARD                                              │  │
│  │   ▼ 红粉系列                                       │  │
│  │     ┌──────┬──────┬──────┬──────┬──────┐          │  │
│  │     │ 色块 │ 色块 │ 色块 │ 色块 │ 色块 │  网格视图 │  │
│  │     │ M-11 │ M-12 │ M-13 │ ...  │      │          │  │
│  │     │ 1200 │ 300 ⚠│  0 ❌│      │      │          │  │
│  │     └──────┴──────┴──────┴──────┴──────┘          │  │
│  │                                                    │  │
│  │   ▶ 绿色系列                                       │  │
│  │   ▶ 蓝色系列                                       │  │
│  │                                                    │  │
│  │ ▼ Coco                                             │  │
│  │   ...                                              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**交互细节**：

- 每个色块显示：颜色预览圆点 + 色号名 + 库存数 + 状态图标（⚠ 低仓 / ❌ 空仓）
- 点击色块弹出详情侧板或弹窗：操作日志时间线、快速入库/出库、设置阈值
- 颜色预览小圆点用 CSS `background-color` 渲染（与编辑器一致）
- 列表视图 / 网格视图切换按钮

**入库弹窗**：

```
┌─────────────────────────────────┐
│  入库 — M-16 正红               │
│                                 │
│  当前库存：1500 颗               │
│  运输中　：1000 颗               │
│                                 │
│  入库数量：[____] 颗             │
│  操作类型：○ 新购入  ○ 盘点修正   │
│  备注　　：[____________]        │
│                                 │
│       [取消]    [确认入库]       │
└─────────────────────────────────┘
```

**库存详情侧板（点击色块展开）**：

```
┌──────────────────────────────────┐
│  🔴 M-16 正红  #E53935           │
│  MARD · 红粉系列                 │
│  ───────────────────────────────  │
│  当前库存    1500 颗    [出入库]  │
│  运输中      1000 颗              │
│  预警阈值     500 颗    [修改]    │
│  ───────────────────────────────  │
│  操作记录                        │
│  ● 07-14  出库 -200  皮卡丘      │
│  ● 07-10  入库 +1000  补货       │
│  ● 07-05  入库 +500   初始库存   │
│  ───────────────────────────────  │
│  关联设计（使用过此色的设计）      │
│  📋 皮卡丘 · 用了 200 颗         │
│  📋 龙猫   · 用了 150 颗         │
└──────────────────────────────────┘
```

#### Tab 2：「图纸」— 现有设计列表（保留但增强）

在现有文件夹+设计卡片基础上，增加：

- 每个设计卡片右下角显示消耗豆子总数小标签
- 鼠标悬浮显示颜色明细 tooltip
- 「消耗详情」按钮，点击查看该设计用了哪些颜色各多少颗

#### Tab 3：「清单」— 采购清单

```
┌─────────────────────────────────────────────────────────┐
│  [+ 新建清单]  [从设计生成]                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ 清单列表 ───────────────────────────────────────┐   │
│  │                                                    │   │
│  │ 📋 3月补豆清单                    草稿  7天前      │   │
│  │   5种颜色 · 共需补 4800 颗                        │   │
│  │                                                    │   │
│  │ 📋 皮卡丘项目补豆                  已下单  3天前    │   │
│  │   8种颜色 · 共需补 3200 颗                        │   │
│  │                                                    │   │
│  └────────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ 清单详情（点击展开）────────────────────────────┐   │
│  │                                                    │   │
│  │  颜色         缺货量    当前库存   建议购买  [操作] │   │
│  │  ─────────────────────────────────────────────── │   │
│  │  🔴 M-16 正红  1200     300        2份(2000) [✓] │   │
│  │  🟡 M-23 正黄   600    1500        1份(1000) [✓] │   │
│  │  🟢 M-35 正绿   200    2800        1份(1000) [✓] │   │
│  │                                                    │   │
│  │  [一键复制清单]  [标记已下单]  [确认到货]            │   │
│  └────────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**「从设计生成」流程**：

1. 弹出「选择设计」对话框，展示用户所有设计（支持多选）
2. 用户选择后点击「生成缺货清单」
3. 系统自动计算每种颜色的需求量、对比库存、标注缺口
4. 用户可以微调每种颜色的购买数量
5. 保存为清单

#### Tab 4：「统计」— 消耗仪表盘

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  │  45    │ │ 18500  │ │   3    │ │  12    │          │
│  │ 色号数 │ │ 总库存 │ │ 空仓数 │ │ 低仓数 │   KPI 卡片│
│  └────────┘ └────────┘ └────────┘ └────────┘          │
│                                                         │
│  ┌─ 消耗趋势图（近6个月柱状图）───────────────────┐    │
│  │  ██                                                   │
│  │  ██ ██                                                │
│  │  ██ ██ ██ ██                                          │
│  │  ██ ██ ██ ██ ██    ██                                 │
│  │  1月 2月 3月 4月 5月 6月                              │
│  └──────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─ 消耗 Top 10 色号 ──────────────────────────────┐   │
│  │  1. M-16 正红   ████████████████ 3500 颗         │   │
│  │  2. M-03 纯白   ██████████████   2900 颗         │   │
│  │  3. M-07 纯黑   ████████████     2400 颗         │   │
│  │  ...                                             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

> **注意**：统计图表使用纯 CSS/Canvas 实现，不引入 ECharts 等重型库。柱状图使用 CSS flexbox + 百分比高度，或使用 `<canvas>` 简单绘制。

### 5.2 编辑器内集成

在现有编辑器工具栏中添加库存状态指示：

```
┌─ 色板面板（右侧）────────────────┐
│                                   │
│  ▼ MARD 红粉系列                  │
│  ┌──────┬──────┬──────┐          │
│  │ 🔴   │ 🟣   │ 🟠   │ 色块    │
│  │ M-16 │ M-13 │ M-25 │          │
│  │ 1500 │ 300⚠ │ 0❌  │ 库存数   │
│  └──────┴──────┴──────┘          │
│                                   │
│  [库存模式: ● 显示全部  ○ 仅显有货]│
└───────────────────────────────────┘
```

- 每个颜色块左下角小字显示库存数量
- 0 库存显示红色小圆点警告
- 低库存显示黄色圆点
- 提供「仅显示有货」过滤模式

### 5.3 导航栏集成

在侧边栏「我的仓库」入口添加预警角标：

```
📦 我的仓库  🔴3     ← 红色角标数字 = 预警色号数
```

### 5.4 消耗确认弹窗（编辑器保存时）

这是最关键的 UX，参考 ohmybead 的设计：

```
┌──────────────────────────────────────────┐
│  消耗确认                                 │
│                                          │
│  您完成了一幅设计，共使用了以下珠子：       │
│                                          │
│  颜色            用量    库存    剩余     │
│  ────────────────────────────────────    │
│  🔴 M-16 正红    200    1500    1300 ✓   │
│  🟡 M-23 正黄    180     300     120 ⚠  │
│  🟢 M-35 正绿     50    2800    2750 ✓   │
│  🔴 M-07 纯黑    350       0    -350 ❌  │  ← 库存不足！
│  ────────────────────────────────────    │
│  ⚠ 1 种颜色库存不足，是否先补货？          │
│                                          │
│  □ 将缺货颜色加入采购清单                  │
│                                          │
│  [跳过消耗]  [仅扣有货的]  [确认消耗]      │
└──────────────────────────────────────────┘
```

**三种操作**：

- **确认消耗**：全量扣减（允许扣到负数，自动标记为缺货）
- **仅扣有货的**：只对有库存的颜色扣减，不足的不扣
- **跳过消耗**：保存设计但不扣库存

---

## 6. 核心功能设计详述

### 6.1 补豆管理

#### 6.1.1 智能补豆提醒

**触发条件**：

- 当 `quantity <= min_threshold` 且 `min_threshold > 0` 时标记为「低库存」
- 当 `quantity <= 0` 时标记为「空仓」
- 当 `quantity + transit_quantity <= min_threshold` 时标记为「即将不足」（即使有在途）

**提醒位置**：

1. 侧边栏「我的仓库」入口角标
2. 库存页面顶部统计条的 ⚠ 数量
3. 编辑器色板中的颜色角标
4. （可选）浏览器 Notification API 推送（需用户授权）

**阈值设置**：

- 用户可逐个颜色设置阈值
- 支持「批量设置」：选择多个颜色 → 统一设置阈值
- 默认值：新入库颜色阈值默认为 200 颗（可在设置中更改全局默认）

#### 6.1.2 批量补豆

主入口：库存页面顶部「批量操作」按钮 → 下拉菜单：

```
[批量入库]  → 打开批量入库面板（可一次选多个颜色分别填数量）
[批量设置阈值] → 选多个颜色统一设阈值
[CSV 导入]   → 上传 CSV 文件
[从设计生成补豆清单] → 跳转到清单 Tab 并自动生成
```

**CSV 导入格式**：

```csv
品牌,色号名,数量,阈值
MARD,M-16 正红,1500,500
Coco,C-11 浅粉,800,200
```

#### 6.1.3 扫码补豆

Web 端使用 [Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API) 或 [html5-qrcode](https://github.com/mebjas/html5-qrcode) 库实现：

- 库存页面顶部「扫码入库」按钮
- 打开摄像头扫描条形码
- 解析出品牌+色号 → 弹出数量输入框 → 确认入库
- 需维护一个「条形码 → 颜色ID」的映射表

**条形码映射表**：

```sql
CREATE TABLE IF NOT EXISTS bead_barcodes (
  barcode   TEXT PRIMARY KEY,             -- 条形码值
  color_id  INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now'))
);
```

如果扫码不识别，提示用户手动选择颜色后关联条形码，下次即可自动识别。

### 6.2 库存明细

#### 6.2.1 入库/出库/消耗记录

所有记录写入 `inventory_logs` 表，不可删除不可修改（仅追加）。

**入库流程**：

```
用户点击 [+ 入库] → 选择颜色 → 输入数量 → 选择类型（新购入/盘点修正）
→ 写入 inventory_logs (action='inbound')
→ 更新 user_bead_inventory.quantity += 入库数量
```

**出库/消耗流程**：

```
编辑器保存设计 → 弹出消耗确认弹窗 → 用户确认
→ 写入 inventory_logs (action='outbound', source_type='design', source_id=xxx)
→ 写入 design_bead_usage（设计消耗明细）
→ 更新 user_bead_inventory.quantity -= 消耗数量
```

**手动调整流程**：

```
库存详情面板 → [调整库存] → 输入实际盘点数量
→ 计算差额 = 实际数量 - 当前库存
→ 写入 inventory_logs (action='adjust', quantity=差额)
→ 更新 user_bead_inventory.quantity = 实际数量
```

#### 6.2.2 操作日志时间线

每条日志展示：

- 时间戳（相对时间，如「3天前」）
- 操作类型图标（📥 入库 / 📤 出库 / ✏️ 调整 / 🚚 运输中 / 📦 到货）
- 颜色信息（色块 + 名称）
- 数量变动（绿色 +N / 红色 -N）
- 操作后余额
- 来源链接（如果是设计消耗，显示设计标题，点击可跳转）
- 备注文字

### 6.3 使用明细

#### 6.3.1 设计消耗详情

通过 `design_bead_usage` 表查询：

- 每个设计用了哪些颜色、各多少颗
- 聚合：所有设计消耗了某颜色多少颗

**前端展示**：

- 设计详情页（DetailView）增加「消耗明细」区域
- 仓库统计 Tab 的「消耗排行」

#### 6.3.2 历史用量统计

```
时间维度：本月 / 近3个月 / 近6个月 / 今年 / 全部
聚合维度：按颜色 / 按系列 / 按品牌
展示形式：排行榜 + 柱状图
```

### 6.4 采购清单

#### 6.4.1 自动生成缺货清单

核心算法：

```javascript
// 伪代码
function generatePurchaseList(userId, designIds, unitSize = 1000) {
  // 1. 汇总所有设计所需颜色及数量
  const needed = {} // { colorId: totalNeeded }
  for (const designId of designIds) {
    const design = getDesign(designId)
    const beadCounts = countBeadsByColor(design.gridData)
    for (const [colorId, count] of Object.entries(beadCounts)) {
      needed[colorId] = (needed[colorId] || 0) + count
    }
  }

  // 2. 获取用户当前库存 + 运输中
  const inventory = getUserInventory(userId)
  const transit = getTransitQuantities(userId)

  // 3. 计算缺口
  const gaps = []
  for (const [colorId, need] of Object.entries(needed)) {
    const current = inventory[colorId]?.quantity || 0
    const inTransit = transit[colorId] || 0
    const effective = current + inTransit
    const gap = Math.max(0, need - effective)
    if (gap > 0) {
      const units = Math.ceil(gap / unitSize)
      gaps.push({ colorId, need, current, inTransit, gap, suggestBuy: units * unitSize })
    }
  }

  // 4. 按品牌+系列分组排序
  gaps.sort(byBrandThenSeries)

  return gaps
}
```

#### 6.4.2 清单生命周期

```
草稿 → 已下单 → 已到货 → （归档）
  ↓       ↓
 取消    取消
```

**草稿**：刚创建，可编辑
**已下单**：确认已购买，物品进入「运输中」状态，更新 `user_bead_inventory.transit_quantity`
**已到货**：确认收货，自动执行入库流程
**取消**：放弃该清单

### 6.5 库存可视化

#### 6.5.1 库存仪表盘

4 个 KPI 卡片：

- 总色号数（库存中有的颜色种类）
- 总库存量（所有颜色数量之和）
- 空仓色号数
- 低仓色号数

#### 6.5.2 消耗趋势图

使用 `<canvas>` 绘制简单柱状图：

- X 轴：月份（近 6 个月）
- Y 轴：消耗总量
- 每个柱子可点击，点击后显示该月消耗明细

#### 6.5.3 颜色消耗排行

水平条形图：

- Top 10 最常用颜色
- 每个条目：颜色色块 + 名称 + 数量 + 进度条

---

## 7. 实施路线图

### 阶段一：基础设施（预计 2-3 天）

- [ ] 数据库迁移：新增 `inventory_logs`、`purchase_lists`、`purchase_items`、`design_bead_usage`、`bead_barcodes` 表
- [ ] 修改 `user_bead_inventory` 表增加 `min_threshold`、`transit_quantity` 字段
- [ ] 编写数据库迁移脚本（`server/db/migrate.js`），兼容已有数据
- [ ] 创建库存日志服务层（`server/services/inventory.js`）
- [ ] 创建采购清单服务层（`server/services/purchase.js`）

### 阶段二：API 开发（预计 3-4 天）

- [ ] 重构 `GET/POST /api/inventory`，增加日志写入
- [ ] 库存日志 API（CRU，无 D）
- [ ] 消耗追踪 API
- [ ] 采购清单 CRUD + 自动生成
- [ ] 补豆提醒 API
- [ ] 统计 API
- [ ] CSV 导入 API

### 阶段三：前端库存管理（预计 4-5 天）

- [ ] `WarehouseView.vue` 改造为多 Tab 布局
- [ ] 库存 Tab：品牌系列分组网格视图 + 列表视图
- [ ] 入库/出库弹窗组件
- [ ] 库存详情侧板组件（操作日志时间线）
- [ ] 颜色搜索 + 筛选功能
- [ ] 预警角标（侧边栏 + 页面内）

### 阶段四：前端采购清单（预计 2-3 天）

- [ ] 清单列表 + 详情视图
- [ ] 「从设计生成」对话框 + 缺口计算展示
- [ ] 清单状态流转 UI
- [ ] 一键复制清单功能

### 阶段五：前端统计仪表盘（预计 2 天）

- [ ] KPI 卡片组件
- [ ] 消耗趋势图（Canvas 柱状图）
- [ ] 消耗排行（CSS 条形图）

### 阶段六：编辑器集成（预计 2 天）

- [ ] 编辑器色板显示库存数量 + 状态指示
- [ ] 消耗确认弹窗组件
- [ ] 「仅显有货」过滤模式

### 阶段七：扫码功能（预计 1-2 天）

- [ ] 条形码映射表数据初始化
- [ ] 扫码入库页面/弹窗
- [ ] 未识别码手动关联流程

### 阶段八：测试与优化（预计 2 天）

- [ ] 所有 API 端点测试
- [ ] 前端交互流程联调
- [ ] 移动端适配（库存页面在手机上浏览的体验）
- [ ] 边界情况：同时消耗多个设计、库存变负数处理、并发安全

---

## 附录 A：关键技术决策

### A.1 为什么不引入 Redis/MySQL？

- 项目目前是单机 SQLite，对个人用户应用完全够用
- better-sqlite3 是同步 API，天然避免了并发竞争（Node.js 单线程）
- 库存扣减在同一个同步事务中完成，保证原子性

### A.2 消耗扣除的原子性保证

```javascript
function consumeBeads(userId, designId, beadUsage) {
  const tx = db.transaction(() => {
    for (const [colorId, count] of Object.entries(beadUsage)) {
      // 更新库存
      db.prepare(
        `UPDATE user_bead_inventory SET quantity = quantity - ?, updated_at = datetime('now')
        WHERE user_id = ? AND color_id = ?`
      ).run(count, userId, colorId)

      // 获取操作后余额
      const inv = db
        .prepare('SELECT quantity FROM user_bead_inventory WHERE user_id = ? AND color_id = ?')
        .get(userId, colorId)

      // 写入日志
      db.prepare(
        `INSERT INTO inventory_logs (user_id, color_id, action, quantity, balance_after, source_type, source_id, source_name)
        VALUES (?, ?, 'outbound', ?, ?, 'design', ?, ?)`
      ).run(userId, colorId, -count, inv.quantity, designId, designTitle)
    }

    // 写入设计消耗明细
    for (const [colorId, count] of Object.entries(beadUsage)) {
      db.prepare(
        `INSERT INTO design_bead_usage (design_id, color_id, bead_count) VALUES (?, ?, ?)
        ON CONFLICT(design_id, color_id) DO UPDATE SET bead_count = ?`
      ).run(designId, colorId, count, count)
    }
  })
  tx() // 同步事务，要么全成功要么全回滚
}
```

### A.3 条形码方案选择

使用 [html5-qrcode](https://github.com/mebjas/html5-qrcode) (MIT 协议，~40KB min+gzip)：

- 支持 QR Code + 多种一维码（EAN-13、Code-128 等）
- 可同时使用后置和前置摄像头
- 纯前端运行，无需后端支持

MARD 等国产珠子包装上常用 EAN-13 条形码，需建立映射。

### A.4 前端图表方案

不使用 ECharts（太重，~1MB），使用纯 Canvas 绘制：

- 柱状图：`<canvas>` 绘制矩形，简单高效
- 条形图：CSS flexbox 模拟（或用同一 Canvas 横过来）
- KPI 卡片：纯 CSS
- 色块网格：CSS Grid

### A.5 采购数量建议算法

```
suggestBuy = ceil(gap / unitSize) × unitSize
```

其中 `unitSize` 默认 1000（拼豆常见包装 1000 颗/份），用户可自定义改为 500、2000 等。

---

## 附录 B：与其他模块的关联

| 关联模块 | 关联方式                                                   |
| -------- | ---------------------------------------------------------- |
| 编辑器   | 保存设计时弹出消耗确认 → 调用 `/api/inventory/consumption` |
| 设计详情 | 显示消耗明细 → 调用 `/api/inventory/usage/:designId`       |
| 发现广场 | 无直接关联（其他人的设计不涉及你的库存）                   |
| 用户主页 | 可选：展示「拥有 X 色号」标签（不暴露具体数量）            |
| 导出     | 导出时可选「同时生成补豆清单」                             |
| 图片导入 | 导入图片生成图纸后 → 可一键跳转到「生成缺货清单」          |

---

## 附录 C：风险与降级

| 风险                 | 措施                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| 扫码功能兼容性差     | Barcode Detection API 仅 Chrome 支持，降级使用 html5-qrcode              |
| 大量历史日志影响性能 | inventory_logs 按月分区（SQLite 不支持原生分区，可定期归档旧数据到 CSV） |
| 开销户误操作         | 日志不可删除，只能插入反向 adjust 记录修正，保证审计链完整               |
| 移动端体验差         | 库存网格在手机上改为列表视图，色块缩小到 40px                            |

---

> **文档维护者**：Claude Code  
> **版本**：v1.0  
> **下次评审**：实施阶段一完成后评审 API 设计
