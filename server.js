// ============================================================
//  豆丁 (Douding) — 拼豆图纸工具 后端服务
//  Node.js + Express + SQLite
//  提供用户认证、图纸 CRUD、珠子数据、图片导入等 API
// ============================================================

import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================
//  配置常量
// ============================================
const JWT_SECRET = process.env.JWT_SECRET || 'douding-secret-key-change-in-production'
const PORT = process.env.PORT || 3456
const JWT_EXPIRES_IN = '30d'
const BCRYPT_ROUNDS = 10
const UPLOAD_MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = /\.(jpg|jpeg|png|gif|webp|bmp)$/i
const DEFAULT_GRID_SIZE = 58

const app = express()

// ============================================
//  中间件配置
// ============================================
app.use(express.json({ limit: '50mb' }))
app.use(express.static(path.join(__dirname, 'public')))

// 配置 multer：处理图片上传
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, 'public', 'uploads'),
    filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
  }),
  limits: { fileSize: UPLOAD_MAX_SIZE },
  fileFilter: (req, file, cb) => cb(null, ALLOWED_IMAGE_TYPES.test(path.extname(file.originalname)))
})

// ============================================
//  数据库初始化
// ============================================
const dbPath = path.join(__dirname, 'douding.db')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      bio TEXT,
      is_vip INTEGER DEFAULT 0,
      vip_expire_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS designs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      grid_width INTEGER NOT NULL DEFAULT 58,
      grid_height INTEGER NOT NULL DEFAULT 58,
      grid_data TEXT NOT NULL,
      thumbnail TEXT,
      is_public INTEGER DEFAULT 0,
      bead_count INTEGER DEFAULT 0,
      color_count INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      brand TEXT DEFAULT 'Hama',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS design_likes (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      design_id INTEGER NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, design_id)
    );

    CREATE TABLE IF NOT EXISTS bead_brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bead_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand_id INTEGER NOT NULL REFERENCES bead_brands(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS bead_colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id INTEGER NOT NULL REFERENCES bead_series(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      hex TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_bead_inventory (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      color_id INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
      quantity INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, color_id)
    );
  `)
}

function seedBeads() {
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

initDB()
seedBeads()

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'public', 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

// ============================================
//  认证中间件
// ============================================
function authRequired(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '请先登录' })
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' })
  }
}

function authOptional(req, res, next) {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.split(' ')[1], JWT_SECRET) } catch {}
  }
  next()
}

// ============================================
//  工具函数
// ============================================
function userPublic(u) {
  return {
    id: u.id, username: u.username, nickname: u.nickname || u.username,
    avatar: u.avatar, bio: u.bio, isVip: !!u.is_vip,
    vipExpireAt: u.vip_expire_at, createdAt: u.created_at
  }
}

function formatDesign(d) {
  if (!d) return null
  return {
    id: d.id, userId: d.user_id, folderId: d.folder_id,
    title: d.title, description: d.description || '',
    gridWidth: d.grid_width, gridHeight: d.grid_height,
    gridData: safeParseJSON(d.grid_data),
    thumbnail: d.thumbnail,
    isPublic: !!d.is_public,
    beadCount: d.bead_count || 0, colorCount: d.color_count || 0,
    likesCount: d.likes_count || 0, viewsCount: d.views_count || 0,
    brand: d.brand || 'Hama',
    createdAt: d.created_at, updatedAt: d.updated_at,
  }
}

function safeParseJSON(str) {
  try { return JSON.parse(str) } catch { return str }
}

function countBeads(gridData) {
  let beadCount = 0
  const colors = new Set()
  try {
    const grid = typeof gridData === 'string' ? JSON.parse(gridData) : gridData
    if (Array.isArray(grid)) {
      for (const row of grid) {
        if (!Array.isArray(row)) continue
        for (const cell of row) {
          if (cell && cell.hex) { beadCount++; colors.add(cell.hex) }
        }
      }
    }
  } catch {}
  return { beadCount, colorCount: colors.size }
}

// ============================================
//  认证路由
// ============================================
app.post('/api/auth/register', (req, res) => {
  const { username, password, nickname } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ code: 400, message: '用户名和密码不能为空' })
  }
  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ code: 400, message: '用户名需要 2-20 个字符' })
  }
  if (password.length < 6) {
    return res.status(400).json({ code: 400, message: '密码至少需要 6 位' })
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existing) return res.status(409).json({ code: 409, message: '用户名已存在' })

  const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS)
  const result = db.prepare('INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)')
    .run(username, hash, nickname || username)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  res.json({ code: 200, data: { token, user: userPublic(user) } })
})

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ code: 400, message: '请输入用户名和密码' })
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ code: 401, message: '用户名或密码错误' })
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  res.json({ code: 200, data: { token, user: userPublic(user) } })
})

app.get('/api/auth/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ code: 404, message: '用户不存在' })
  res.json({ code: 200, data: userPublic(user) })
})

app.put('/api/auth/profile', authRequired, (req, res) => {
  const { nickname, bio } = req.body || {}
  db.prepare('UPDATE users SET nickname = ?, bio = ?, updated_at = datetime("now") WHERE id = ?')
    .run(nickname || null, bio || null, req.user.id)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  res.json({ code: 200, data: userPublic(user) })
})

// ============================================
//  珠子数据路由
// ============================================
app.get('/api/beads', (req, res) => {
  const brands = db.prepare('SELECT * FROM bead_brands ORDER BY id').all()
  const data = brands.map(b => {
    const series = db.prepare('SELECT * FROM bead_series WHERE brand_id = ? ORDER BY sort_order').all(b.id)
    return {
      name: b.name, slug: b.slug,
      series: series.map(s => {
        const colors = db.prepare('SELECT id, name, hex FROM bead_colors WHERE series_id = ? ORDER BY sort_order').all(s.id)
        return { id: s.id, name: s.name, colors }
      })
    }
  })
  res.json({ code: 200, data })
})

app.get('/api/beads/colors', (req, res) => {
  const colors = db.prepare(`
    SELECT c.id, c.name, c.hex, s.name as series, b.name as brand
    FROM bead_colors c
    JOIN bead_series s ON c.series_id = s.id
    JOIN bead_brands b ON s.brand_id = b.id
    ORDER BY b.id, s.sort_order, c.sort_order
  `).all()
  res.json({ code: 200, data: colors })
})

// ============================================
//  设计 CRUD 路由
// ============================================
app.post('/api/designs', authRequired, (req, res) => {
  const { title, description, gridWidth, gridHeight, gridData, thumbnail, isPublic, brand, folderId } = req.body || {}
  if (!title || !gridData || !gridWidth || !gridHeight) {
    return res.status(400).json({ code: 400, message: '缺少必要参数' })
  }

  const { beadCount, colorCount } = countBeads(gridData)
  const gridStr = typeof gridData === 'string' ? gridData : JSON.stringify(gridData)

  const result = db.prepare(`
    INSERT INTO designs (user_id, folder_id, title, description, grid_width, grid_height,
      grid_data, thumbnail, is_public, brand, bead_count, color_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, folderId || null, title, description || '',
    gridWidth, gridHeight, gridStr, thumbnail || null, isPublic ? 1 : 0, brand || 'Hama', beadCount, colorCount)

  const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(result.lastInsertRowid)
  res.json({ code: 200, data: formatDesign(design) })
})

app.put('/api/designs/:id', authRequired, (req, res) => {
  const design = db.prepare('SELECT * FROM designs WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id)
  if (!design) return res.status(404).json({ code: 404, message: '设计不存在或无权修改' })

  const { title, description, gridData, gridWidth, gridHeight, thumbnail, isPublic, folderId } = req.body || {}

  let beadCount = design.bead_count, colorCount = design.color_count
  if (gridData) {
    const stats = countBeads(gridData)
    beadCount = stats.beadCount; colorCount = stats.colorCount
  }

  db.prepare(`
    UPDATE designs SET title=?, description=?, grid_data=?, grid_width=?, grid_height=?,
      thumbnail=?, is_public=?, folder_id=?, bead_count=?, color_count=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    title || design.title,
    description !== undefined ? description : design.description,
    gridData ? (typeof gridData === 'string' ? gridData : JSON.stringify(gridData)) : design.grid_data,
    gridWidth || design.grid_width,
    gridHeight || design.grid_height,
    thumbnail !== undefined ? thumbnail : design.thumbnail,
    isPublic !== undefined ? (isPublic ? 1 : 0) : design.is_public,
    folderId !== undefined ? folderId : design.folder_id,
    beadCount, colorCount, design.id
  )

  const updated = db.prepare('SELECT * FROM designs WHERE id = ?').get(design.id)
  res.json({ code: 200, data: formatDesign(updated) })
})

app.get('/api/designs/:id', authOptional, (req, res) => {
  const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(req.params.id)
  if (!design) return res.status(404).json({ code: 404, message: '设计不存在' })

  db.prepare('UPDATE designs SET views_count = views_count + 1 WHERE id = ?').run(design.id)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(design.user_id)

  let liked = false
  if (req.user) {
    const like = db.prepare('SELECT 1 FROM design_likes WHERE user_id = ? AND design_id = ?')
      .get(req.user.id, design.id)
    liked = !!like
  }

  res.json({ code: 200, data: {
    ...formatDesign(design),
    author: user ? userPublic(user) : null,
    liked,
  }})
})

app.delete('/api/designs/:id', authRequired, (req, res) => {
  const design = db.prepare('SELECT * FROM designs WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id)
  if (!design) return res.status(404).json({ code: 404, message: '设计不存在或无权删除' })
  db.prepare('DELETE FROM designs WHERE id = ?').run(design.id)
  res.json({ code: 200, message: '已删除' })
})

app.get('/api/designs', authRequired, (req, res) => {
  const { folder_id, page = 1, limit = 20 } = req.query
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

  let designs, total
  if (folder_id) {
    designs = db.prepare('SELECT * FROM designs WHERE user_id = ? AND folder_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?')
      .all(req.user.id, folder_id, parseInt(limit), offset)
    total = db.prepare('SELECT COUNT(*) as c FROM designs WHERE user_id = ? AND folder_id = ?')
      .get(req.user.id, folder_id)
  } else {
    designs = db.prepare('SELECT * FROM designs WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?')
      .all(req.user.id, parseInt(limit), offset)
    total = db.prepare('SELECT COUNT(*) as c FROM designs WHERE user_id = ?').get(req.user.id)
  }

  res.json({ code: 200, data: { list: designs.map(formatDesign), total: total.c, page: parseInt(page), limit: parseInt(limit) }})
})

// ============================================
//  发现页 & 搜索
// ============================================
app.get('/api/explore', authOptional, (req, res) => {
  const { page = 1, limit = 24, sort = 'latest' } = req.query
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)
  const orderMap = { latest: 'd.updated_at DESC', popular: 'd.likes_count DESC', views: 'd.views_count DESC' }
  const orderBy = orderMap[sort] || orderMap.latest

  const designs = db.prepare(`
    SELECT d.*, u.username, u.nickname, u.avatar
    FROM designs d JOIN users u ON d.user_id = u.id
    WHERE d.is_public = 1
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(parseInt(limit), offset)

  const total = db.prepare('SELECT COUNT(*) as c FROM designs WHERE is_public = 1').get()

  res.json({ code: 200, data: {
    list: designs.map(d => ({
      ...formatDesign(d),
      author: { id: d.user_id, username: d.username, nickname: d.nickname || d.username, avatar: d.avatar }
    })),
    total: total.c,
  }})
})

app.get('/api/search', (req, res) => {
  const { q, page = 1, limit = 24 } = req.query
  if (!q) return res.json({ code: 200, data: { list: [], total: 0 } })
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)
  const like = `%${q}%`

  const designs = db.prepare(`
    SELECT d.*, u.username, u.nickname, u.avatar
    FROM designs d JOIN users u ON d.user_id = u.id
    WHERE d.is_public = 1 AND (d.title LIKE ? OR d.description LIKE ?)
    ORDER BY d.updated_at DESC LIMIT ? OFFSET ?
  `).all(like, like, parseInt(limit), offset)

  const total = db.prepare(
    'SELECT COUNT(*) as c FROM designs WHERE is_public = 1 AND (title LIKE ? OR description LIKE ?)'
  ).get(like, like)

  res.json({ code: 200, data: {
    list: designs.map(d => ({
      ...formatDesign(d),
      author: { id: d.user_id, username: d.username, nickname: d.nickname || d.username, avatar: d.avatar }
    })),
    total: total.c,
  }})
})

// 点赞/取消点赞
app.post('/api/designs/:id/like', authRequired, (req, res) => {
  const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(req.params.id)
  if (!design) return res.status(404).json({ code: 404, message: '设计不存在' })

  const existing = db.prepare('SELECT 1 FROM design_likes WHERE user_id = ? AND design_id = ?')
    .get(req.user.id, design.id)

  if (existing) {
    db.prepare('DELETE FROM design_likes WHERE user_id = ? AND design_id = ?').run(req.user.id, design.id)
    db.prepare('UPDATE designs SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(design.id)
    res.json({ code: 200, data: { liked: false } })
  } else {
    db.prepare('INSERT INTO design_likes (user_id, design_id) VALUES (?, ?)').run(req.user.id, design.id)
    db.prepare('UPDATE designs SET likes_count = likes_count + 1 WHERE id = ?').run(design.id)
    res.json({ code: 200, data: { liked: true } })
  }
})

// ============================================
//  文件夹管理
// ============================================
app.get('/api/folders', authRequired, (req, res) => {
  const folders = db.prepare(`
    SELECT f.*, (SELECT COUNT(*) FROM designs d WHERE d.folder_id = f.id) as design_count
    FROM folders f WHERE f.user_id = ? ORDER BY f.sort_order
  `).all(req.user.id)
  res.json({ code: 200, data: folders })
})

app.post('/api/folders', authRequired, (req, res) => {
  const { name } = req.body || {}
  if (!name) return res.status(400).json({ code: 400, message: '请输入文件夹名称' })
  const result = db.prepare('INSERT INTO folders (user_id, name) VALUES (?, ?)').run(req.user.id, name)
  const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(result.lastInsertRowid)
  res.json({ code: 200, data: folder })
})

app.put('/api/folders/:id', authRequired, (req, res) => {
  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!folder) return res.status(404).json({ code: 404, message: '文件夹不存在' })
  const { name } = req.body || {}
  db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name || folder.name, folder.id)
  res.json({ code: 200, data: { ...folder, name: name || folder.name } })
})

app.delete('/api/folders/:id', authRequired, (req, res) => {
  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!folder) return res.status(404).json({ code: 404, message: '文件夹不存在' })
  db.prepare('UPDATE designs SET folder_id = NULL WHERE folder_id = ?').run(folder.id)
  db.prepare('DELETE FROM folders WHERE id = ?').run(folder.id)
  res.json({ code: 200, message: '已删除' })
})

// ============================================
//  图片上传与转换
// ============================================
app.post('/api/upload', authRequired, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ code: 400, message: '请选择图片' })
  res.json({ code: 200, data: { url: `/uploads/${req.file.filename}`, filename: req.file.filename } })
})

app.post('/api/image-to-grid', authOptional, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ code: 400, message: '请选择图片' })
  const targetWidth = parseInt(req.body.targetWidth) || DEFAULT_GRID_SIZE

  try {
    const sharp = (await import('sharp')).default
    const metadata = await sharp(req.file.path).metadata()
    const targetHeight = Math.round(targetWidth * (metadata.height / metadata.width))

    // 缩放图片 → 移除Alpha → 提取原始 RGB 像素
    const { data, info } = await sharp(req.file.path)
      .resize(targetWidth, targetHeight, { fit: 'fill', kernel: 'lanczos3' })
      .removeAlpha()
      .raw().toBuffer({ resolveWithObject: true })

    // 加载珠子颜色并预计算 Lab
    const allColors = db.prepare('SELECT c.id, c.name, c.hex FROM bead_colors c ORDER BY c.id').all()
    const labColors = allColors.map(c => ({
      ...c,
      lab: rgbToLab(
        parseInt(c.hex.substring(1, 3), 16),
        parseInt(c.hex.substring(3, 5), 16),
        parseInt(c.hex.substring(5, 7), 16)
      )
    }))

    // Floyd-Steinberg 抖动 + Lab 匹配
    const result = floydSteinbergDither(info.width, info.height, data, labColors)

    res.json({
      code: 200,
      data: {
        url: `/uploads/${req.file.filename}`,
        grid: result.grid,
        gridWidth: info.width,
        gridHeight: info.height,
        algorithm: 'lab+floyd-steinberg'
      }
    })
  } catch (e) {
    console.error('图片转换失败:', e)
    res.status(500).json({ code: 500, message: '图片处理失败: ' + e.message })
  }
})

// ============================================
//  Lab 色彩空间 + Floyd-Steinberg 抖动算法
// ============================================

/** RGB → CIE Lab（感知均匀色彩空间） */
function rgbToLab(r, g, b) {
  // sRGB 线性化
  const linearize = v => { v /= 255; return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92 }
  const rl = linearize(r), gl = linearize(g), bl = linearize(b)
  // sRGB → XYZ (D65)
  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) * 100
  const y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) * 100
  const z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) * 100
  // XYZ → Lab (D65)
  const xn = 95.047, yn = 100.000, zn = 108.883
  const f = t => t > 0.008856 ? Math.cbrt(t) : (903.3 * t + 16) / 116
  const fy = f(y / yn)
  return {
    L: Math.max(0, 116 * fy - 16),
    a: 500 * (f(x / xn) - fy),
    b: 200 * (fy - f(z / zn))
  }
}

/** Lab ΔE 距离（感知均匀） */
function deltaE(l1, l2) {
  return Math.sqrt((l1.L - l2.L) ** 2 + (l1.a - l2.a) ** 2 + (l1.b - l2.b) ** 2)
}

/** Floyd-Steinberg 误差扩散抖动：将连续色调映射到有限色板 */
function floydSteinbergDither(w, h, pixels, labColors) {
  // Float32 累积误差（避免 Uint8 钳位）
  const len = w * h * 3
  const errors = new Float32Array(len)
  for (let i = 0; i < len; i++) errors[i] = pixels[i]

  const grid = []
  for (let y = 0; y < h; y++) {
    const row = []
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      // 当前像素 = 原始 + 累积误差
      const r = clamp(Math.round(errors[i]))
      const g = clamp(Math.round(errors[i + 1]))
      const b = clamp(Math.round(errors[i + 2]))

      // Lab 最邻近匹配
      const pixelLab = rgbToLab(r, g, b)
      let best = labColors[0], bestDist = Infinity
      for (const c of labColors) {
        const d = deltaE(pixelLab, c.lab)
        if (d < bestDist) { bestDist = d; best = c }
      }

      row.push(best ? { id: best.id, name: best.name, hex: best.hex.toUpperCase() } : null)

      // 量化误差 = 原始 - 量化后
      const qh = best.hex.replace('#', '')
      const er = r - parseInt(qh.substring(0, 2), 16)
      const eg = g - parseInt(qh.substring(2, 4), 16)
      const eb = b - parseInt(qh.substring(4, 6), 16)

      // Floyd-Steinberg 误差扩散权重
      const dist = (dx, dy, wgt) => {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) return
        const ni = (ny * w + nx) * 3
        errors[ni] += er * wgt; errors[ni + 1] += eg * wgt; errors[ni + 2] += eb * wgt
      }
      dist(1, 0, 7 / 16)
      dist(-1, 1, 3 / 16)
      dist(0, 1, 5 / 16)
      dist(1, 1, 1 / 16)
    }
    grid.push(row)
  }
  return { grid }
}

function clamp(v) { return Math.max(0, Math.min(255, v)) }

// ============================================
//  用户珠子库存
// ============================================
app.get('/api/inventory', authRequired, (req, res) => {
  const items = db.prepare(`
    SELECT ui.quantity, c.id as color_id, c.name, c.hex, s.name as series, b.name as brand
    FROM user_bead_inventory ui
    JOIN bead_colors c ON ui.color_id = c.id
    JOIN bead_series s ON c.series_id = s.id
    JOIN bead_brands b ON s.brand_id = b.id
    WHERE ui.user_id = ? AND ui.quantity > 0
    ORDER BY b.id, s.sort_order, c.sort_order
  `).all(req.user.id)
  res.json({ code: 200, data: items })
})

app.post('/api/inventory', authRequired, (req, res) => {
  const { colorId, quantity } = req.body || {}
  if (!colorId || quantity === undefined) return res.status(400).json({ code: 400, message: '无效参数' })
  db.prepare(`
    INSERT INTO user_bead_inventory (user_id, color_id, quantity, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, color_id) DO UPDATE SET quantity = ?, updated_at = datetime('now')
  `).run(req.user.id, colorId, quantity, quantity)
  res.json({ code: 200, message: 'ok' })
})

// ============================================
//  用户公开主页
// ============================================
app.get('/api/user/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ code: 404, message: '用户不存在' })

  const designs = db.prepare(
    'SELECT * FROM designs WHERE user_id = ? AND is_public = 1 ORDER BY updated_at DESC LIMIT 50'
  ).all(user.id)

  res.json({ code: 200, data: {
    ...userPublic(user),
    designs: designs.map(formatDesign),
    designCount: designs.length,
  }})
})

// ============================================
//  公共接口
// ============================================
app.get('/api/public/app/version', (req, res) => {
  res.json({ code: 200, data: { latestVersion: '2.0.0', apkEnabled: false } })
})

app.get('/api/public/announcement', (req, res) => {
  res.json({ code: 200, data: { status: 'none' } })
})

// ============================================
//  生产模式：Serve 构建后的前端
// ============================================
const distPath = path.join(__dirname, 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// ============================================
//  启动服务
// ============================================
app.listen(PORT, () => {
  console.log(`🧩 豆丁 Douding 服务已启动 → http://localhost:${PORT}`)
  console.log(`前端开发模式请运行: npm run dev`)
})
