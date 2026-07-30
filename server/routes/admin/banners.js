// ============================================
//  Banner 管理路由 — CRUD + 排序 + 排期
// ============================================
import { Router } from 'express'
import db from '../../db/connection.js'
import { adminRequired } from '../../middleware/adminAuth.js'
import { success, fail, paginated } from '../../utils/response.js'
import { logAction } from '../../services/admin/logService.js'

const router = Router()

// Banner 列表
router.get('/', adminRequired, (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

    let where = 'WHERE 1=1'
    const params = []
    if (status !== undefined && status !== '') {
      where += ' AND status = ?'
      params.push(parseInt(status))
    }

    const total = db.prepare(`SELECT COUNT(*) as c FROM banners ${where}`).get(...params)
    const list = db.prepare(
      `SELECT * FROM banners ${where} ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), offset)

    res.json(paginated(list, total.c, parseInt(page), parseInt(limit)))
  } catch (err) {
    console.error('获取Banner列表错误:', err)
    res.status(500).json(fail(500, '获取Banner列表失败'))
  }
})

// Banner 详情
router.get('/:id', adminRequired, (req, res) => {
  try {
    const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id)
    if (!banner) return res.status(404).json(fail(404, 'Banner不存在'))
    res.json(success(banner))
  } catch (err) {
    res.status(500).json(fail(500, '获取Banner详情失败'))
  }
})

// 新增 Banner
router.post('/', adminRequired, (req, res) => {
  try {
    const { title, subtitle, imageUrl, bgColor, linkType, linkValue, sortOrder, status, startTime, endTime } = req.body || {}
    if (!title) return res.status(400).json(fail(400, '请输入Banner标题'))

    const result = db.prepare(
      `INSERT INTO banners (title, subtitle, image_url, bg_color, link_type, link_value, sort_order, status, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      title, subtitle || '', imageUrl || '', bgColor || '#22c55e',
      linkType || 'route', linkValue || '', sortOrder || 0,
      status !== undefined ? status : 1, startTime || null, endTime || null
    )

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '运营管理', action: 'create', targetType: 'banner', targetId: result.lastInsertRowid,
      detail: JSON.stringify({ title }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(result.lastInsertRowid)
    res.json(success(banner))
  } catch (err) {
    console.error('创建Banner错误:', err)
    res.status(500).json(fail(500, '创建Banner失败'))
  }
})

// 更新 Banner
router.put('/:id', adminRequired, (req, res) => {
  try {
    const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id)
    if (!banner) return res.status(404).json(fail(404, 'Banner不存在'))

    const { title, subtitle, imageUrl, bgColor, linkType, linkValue, sortOrder, status, startTime, endTime } = req.body || {}

    db.prepare(
      `UPDATE banners SET title = ?, subtitle = ?, image_url = ?, bg_color = ?, link_type = ?,
       link_value = ?, sort_order = ?, status = ?, start_time = ?, end_time = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      title !== undefined ? title : banner.title,
      subtitle !== undefined ? subtitle : banner.subtitle,
      imageUrl !== undefined ? imageUrl : banner.image_url,
      bgColor !== undefined ? bgColor : banner.bg_color,
      linkType !== undefined ? linkType : banner.link_type,
      linkValue !== undefined ? linkValue : banner.link_value,
      sortOrder !== undefined ? sortOrder : banner.sort_order,
      status !== undefined ? status : banner.status,
      startTime !== undefined ? startTime : banner.start_time,
      endTime !== undefined ? endTime : banner.end_time,
      banner.id
    )

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '运营管理', action: 'update', targetType: 'banner', targetId: banner.id,
      detail: JSON.stringify({ title }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    const updated = db.prepare('SELECT * FROM banners WHERE id = ?').get(banner.id)
    res.json(success(updated))
  } catch (err) {
    console.error('更新Banner错误:', err)
    res.status(500).json(fail(500, '更新Banner失败'))
  }
})

// 删除 Banner
router.delete('/:id', adminRequired, (req, res) => {
  try {
    const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id)
    if (!banner) return res.status(404).json(fail(404, 'Banner不存在'))

    db.prepare('DELETE FROM banners WHERE id = ?').run(banner.id)

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '运营管理', action: 'delete', targetType: 'banner', targetId: banner.id,
      detail: JSON.stringify({ title: banner.title }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    res.json(success(null))
  } catch (err) {
    console.error('删除Banner错误:', err)
    res.status(500).json(fail(500, '删除Banner失败'))
  }
})

export default router
