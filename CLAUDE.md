# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言偏好

始终使用中文与用户交流。所有回复、解释、代码注释都应使用中文。变量名和函数名可以使用英文，但注释和文档必须用中文。

---

## 项目概述

**豆丁 (Douding)** — 在线拼豆图纸设计工具。用户可在像素网格上创作拼豆图案，将像素匹配到真实珠子颜色（Hama/Perler/Artkal），导入图片自动转换，导出 PNG 图纸。

### 核心功能

- 🎨 **拼豆编辑器** — 多层画布（珠子层/网格层/参考图层），支持画笔、橡皮、填充、吸色、平移、缩放
- 🖼️ **照片转图纸** — 上传图片 → 后端 Sharp 裁剪/缩放 + Lab 色彩量化 + Floyd-Steinberg 抖动 → 逐像素匹配珠子颜色
- 🔤 **OCR 识别图纸** — 上传图纸照片 → 后端 Tesseract.js 识别色号标注 → 自动生成网格
- 🔗 **链接导入** — 粘贴小红书分享链接 → 后端爬虫解析提取图片 → 自动转图纸
- 📋 **发现广场** — 浏览社区公开作品，按最新/热门/浏览量排序
- 🔍 **搜索** — 按标题和描述搜索公开设计
- 👤 **用户系统** — JWT 注册/登录，个人主页，作品管理
- 📦 **仓库管理** — 文件夹组织，设计 CRUD
- ❤️ **点赞互动** — 给喜欢的设计点赞/取消点赞
- 📥 **高清导出** — 后端 Sharp 生成高清 PNG，支持批量 ZIP 导出
- 📱 **移动端适配** — 触摸友好的响应式设计

---

## 技术栈

| 层级     | 技术                    | 说明                        |
| -------- | ----------------------- | --------------------------- |
| 前端框架 | Vue 3 (Composition API) | 组件化，响应式，生态成熟    |
| 构建工具 | Vite 5                  | 极速 HMR，开箱即用          |
| CSS 方案 | Tailwind CSS 3          | 原子化 CSS，dmao.cloud 同款 |
| 后端框架 | Express 4               | Node.js Web 框架            |
| 数据库   | SQLite (better-sqlite3) | 零配置，嵌入式              |
| 认证     | JWT (jsonwebtoken)      | 30 天过期                   |
| 图片处理 | sharp                   | 高性能图片缩放和像素提取    |
| 图标库   | Lucide Vue              | 轻量开源图标                |

---

## 项目结构

```
douding/
├── index.html              # Vite 入口 HTML
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── douding.db              # SQLite 数据库（自动创建）
│
├── server/                 # 后端模块（Express + SQLite）
│   ├── index.js            # Express 应用入口
│   ├── config.js           # 配置常量
│   ├── db/
│   │   ├── connection.js   # 数据库连接
│   │   ├── schema.js       # 建表语句
│   │   └── seed.js         # 珠子数据初始化
│   ├── middleware/
│   │   ├── auth.js         # JWT 认证中间件
│   │   └── upload.js       # Multer 上传配置
│   ├── routes/             # 路由层（参数校验 + 响应格式化）
│   │   ├── auth.js, beads.js, designs.js, explore.js
│   │   ├── folders.js, inventory.js, image.js
│   │   ├── export.js       # 高清导出路由
│   │   ├── ocr.js          # OCR 识别路由
│   │   ├── crawler.js      # 外部链接导入路由
│   │   └── public.js       # 版本 + 公告
│   ├── services/           # 业务逻辑层
│   │   ├── colorMatch.js   # 珠子颜色匹配
│   │   ├── dither.js       # Floyd-Steinberg 抖动算法
│   │   ├── export.js       # Sharp 高清导出
│   │   ├── ocr.js          # Tesseract.js OCR
│   │   └── crawler.js      # 网页爬虫
│   └── utils/
│       ├── helpers.js      # userPublic, formatDesign 等
│       ├── jwt.js          # JWT 签发/验证
│       └── colorSpace.js   # Lab 色彩空间转换
│
├── public/                 # 静态资源
│   ├── favicon.svg
│   └── uploads/            # 用户上传图片（gitignore）
│
└── src/                    # Vue 前端源码
    ├── main.js             # Vue 应用入口
    ├── App.vue             # 根组件（侧边栏 + 路由出口）
    ├── router.js           # Vue Router 路由配置
    ├── style.css           # Tailwind + 全局样式
    │
    ├── api/                # API 请求层
    │   └── index.js        # 封装 fetch，自动附加 JWT
    │
    ├── composables/        # 组合式函数
    │   ├── useAuth.js      # 认证状态管理
    │   ├── useToast.js     # Toast 提示
    │   └── useBeads.js     # 珠子数据加载
    │
    ├── components/         # 通用 UI 组件
    │   ├── AppSidebar.vue  # 侧边栏导航
    │   ├── AppToast.vue    # 全局提示条
    │   ├── DesignCard.vue  # 设计卡片
    │   └── Modal.vue       # 通用模态框
    │
    ├── views/              # 页面级组件
    │   ├── HomeView.vue    # 发现广场
    │   ├── EditorView.vue  # 拼豆编辑器
    │   ├── ImageImportView.vue # 照片转图纸
    │   ├── OcrView.vue     # OCR 识别图纸
    │   ├── LinkImportView.vue # 外部链接导入
    │   ├── AuthView.vue    # 登录/注册
    │   ├── DetailView.vue  # 设计详情
    │   ├── WarehouseView.vue # 我的仓库
    │   ├── ProfileView.vue # 个人主页
    │   └── SearchView.vue  # 搜索页
    │
    └── utils/              # 工具函数
        ├── canvas.js       # Canvas 渲染器
        ├── colorMatch.js   # 颜色匹配（@deprecated 后端统一处理）
        ├── colors.js       # 颜色统计（@deprecated）
        └── helpers.js      # HTML 转义、格式化等
```

---

## 开发命令

```bash
npm install          # 安装依赖
npm run dev          # 启动 Vite 开发服务器（前端 :5173）
node server/index.js # 启动后端（:3456）
npm run build        # 生产构建到 dist/
npm start            # 生产模式启动后端 + serve 前端
```

开发时 Vite 自动代理 `/api` 到后端 `:3456`，避免跨域问题。生产模式后端直接 serve `dist/` 目录。

---

## 数据库设计

### 表结构

```sql
users           — id, username, password_hash, nickname, avatar, bio, is_vip,
                  vip_expire_at, created_at, updated_at

designs         — id, user_id, folder_id, title, description, grid_width,
                  grid_height, grid_data (JSON TEXT), thumbnail, is_public,
                  bead_count, color_count, likes_count, views_count, brand,
                  created_at, updated_at

folders         — id, user_id, name, sort_order, created_at

design_likes    — user_id, design_id, created_at (联合主键)

bead_brands     — id, name, slug
bead_series     — id, brand_id, name, sort_order
bead_colors     — id, series_id, name, hex, sort_order

user_bead_inventory — user_id, color_id, quantity (联合主键)
```

### 关键设计

- `designs.grid_data` 存储为 JSON 字符串：`[[{"name":"Red","hex":"#E53935","brand":"Hama","series":"红粉色"}|null, ...], ...]`
- `bead_colors` 预置 3 品牌 × 69 色 = 207 种珠子颜色
- 点赞使用 upsert：`INSERT ... ON CONFLICT DO UPDATE`

---

## API 设计

所有 API 前缀 `/api`。响应格式：`{ code: 200, data: ... }` 成功，`{ code: 4xx|5xx, message: "..." }` 错误。

### 认证路由

| 方法 | 路由               | 认证 | 说明                                       |
| ---- | ------------------ | ---- | ------------------------------------------ |
| POST | /api/auth/register | 否   | 注册（username + password, 可选 nickname） |
| POST | /api/auth/login    | 否   | 登录，返回 token + user                    |
| GET  | /api/auth/me       | 是   | 当前用户信息                               |
| PUT  | /api/auth/profile  | 是   | 更新个人资料                               |
| GET  | /api/user/:id      | 可选 | 用户公开主页 + 作品列表                    |

### 设计路由

| 方法   | 路由                  | 认证 | 说明                                |
| ------ | --------------------- | ---- | ----------------------------------- |
| POST   | /api/designs          | 是   | 创建设计                            |
| GET    | /api/designs/:id      | 可选 | 设计详情（+1 浏览）                 |
| PUT    | /api/designs/:id      | 是   | 更新设计（仅所有者）                |
| DELETE | /api/designs/:id      | 是   | 删除设计（仅所有者）                |
| GET    | /api/designs          | 是   | 我的设计列表（支持 folder_id 筛选） |
| GET    | /api/explore          | 可选 | 公开设计广场（?sort=latest          | popular | views） |
| GET    | /api/search           | 否   | 搜索公开设计（?q=关键词）           |
| POST   | /api/designs/:id/like | 是   | 点赞/取消点赞                       |

### 其他路由

| 方法       | 路由               | 说明                           |
| ---------- | ------------------ | ------------------------------ |
| GET        | /api/beads         | 珠子层级数据（品牌→系列→颜色） |
| GET        | /api/beads/colors  | 珠子扁平列表（编辑器调色板用） |
| POST       | /api/image-to-grid | 上传图片 → 网格数据            |
| GET/POST   | /api/folders       | 文件夹 CRUD                    |
| PUT/DELETE | /api/folders/:id   | 文件夹重命名/删除              |
| GET/POST   | /api/inventory     | 珠子库存管理                   |

---

## 前端路由

| 路径        | 页面         | 说明                           |
| ----------- | ------------ | ------------------------------ |
| /           | 发现广场     | 首页，展示公开设计卡片流       |
| /editor     | 编辑器       | 拼豆画板，支持创建/编辑        |
| /editor/:id | 编辑已有设计 | …                              |
| /detail/:id | 设计详情     | 预览、作者信息、颜色统计、点赞 |
| /login      | 登录/注册    | …                              |
| /warehouse  | 我的仓库     | 文件夹侧边栏 + 设计列表        |
| /user/:id   | 用户主页     | 公开信息和作品                 |
| /search     | 搜索         | 关键词搜索                     |

---

## 编辑器核心架构

使用三层 `<canvas>` 叠加：

1. **refCanvas**（底层）— 参考图（从图片导入生成），半透明显示
2. **mainCanvas**（中层）— 珠子网格，每珠 = 1 内部像素，通过 `ImageData` 渲染
3. **gridCanvas**（顶层）— 网格线，纯 CSS/Canvas 绘制

缩放通过 CSS `width/height = gridSize × zoom` 控制，内部像素分辨率不变，`image-rendering: pixelated` 保证清晰度。

平移偏移量 `panX/panY` 改变画布在容器内的居中位置。

### 工具系统

- **画笔** (`brush`): brushSize × brushSize 范围绘制，支持镜像
- **橡皮** (`eraser`): 清除指定范围珠子
- **填充** (`fill`): 泛洪算法，替换相连同色区域
- **吸色** (`picker`): 点击取色，自动切回画笔
- **移动** (`move`): 拖拽平移画布

### 撤销/重做

全量快照数组 + 索引指针，最多 200 步。

---

## 颜色匹配算法

加权欧几里得距离（人眼对绿色更敏感）：

```
distance = dr² × 2 + dg² × 3 + db² × 1
```

遍历所有珠子颜色，取距离最小的作为匹配结果。

---

## 设计系统

基于 dmao.cloud 设计语言：

- **主色**: `#0058BC`（品牌蓝）
- **背景**: `#f8fafc`（slate-50）
- **卡片**: 白色 `#fff`，16px 圆角，细微阴影
- **字体**: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", Helvetica, Arial
- **圆角**: 大圆角风格（卡片 16px，按钮 pill）
- **筛选标签**: Chip 风格，激活态蓝底蓝字
- **缩略图**: `image-rendering: pixelated` 像素完美渲染
- **导航栏**: 白色半透明 + backdrop-filter 毛玻璃
- **暗色模式**: 可选支持 `data-theme="dark"`

---

## 关键开发规则

1. **代码注释用中文**，变量/函数名用英文小驼峰
2. **组件化开发**：一个 `.vue` 文件负责一件事
3. **API 层隔离**：所有后端请求走 `src/api/index.js`，不在组件中直接 fetch
4. **移动端优先**：先写移动端样式，再用 `md:` `lg:` 断点适配桌面
5. **渐进增强**：核心功能不依赖 JS 框架特性，保证可访问性
6. **无外部 CDN 依赖**（除了字体），所有资源本地化
