// ============================================================
//  制作模式路由 — 制作进度保存/恢复/完成
// ============================================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authRequired } from '../middleware/auth.js'
import { success, fail, paginated } from '../utils/response.js'

const router = Router()

// GET /api/make/progress/:designId — 获取制作进度
router.get('/make/progress/:designId', authRequired, (req, res) => {
  try {
    const session = db
      .prepare(
        'SELECT * FROM make_sessions WHERE user_id = ? AND design_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1'
      )
      .get(req.user.id, req.params.designId, 'in_progress')

    if (!session) {
      return res.json(success(null))
    }

    res.json(
      success({
        id: session.id,
        currentStep: session.current_step,
        finishedSteps: JSON.parse(session.finished_steps || '[]'),
        stepMode: session.step_mode,
        totalDuration: session.total_duration,
        archiveName: session.archive_name,
        updatedAt: session.updated_at,
      })
    )
  } catch (err) {
    console.error('获取制作进度错误:', err)
    res.status(500).json(fail(500, '获取进度失败'))
  }
})

// POST /api/make/progress/save — 保存制作进度
router.post('/make/progress/save', authRequired, (req, res) => {
  try {
    const { designId, currentStep, finishedSteps, stepMode, totalDuration, archiveName } =
      req.body || {}

    if (!designId) {
      return res.status(400).json(fail(400, '缺少图纸 ID'))
    }

    // 查找是否有进行中的会话
    const existing = db
      .prepare(
        'SELECT id FROM make_sessions WHERE user_id = ? AND design_id = ? AND status = ? LIMIT 1'
      )
      .get(req.user.id, designId, 'in_progress')

    const finishedJson = JSON.stringify(finishedSteps || [])

    if (existing) {
      db.prepare(
        `UPDATE make_sessions SET current_step = ?, finished_steps = ?, step_mode = ?,
          total_duration = ?, archive_name = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        currentStep ?? 0,
        finishedJson,
        stepMode || 'color',
        totalDuration || 0,
        archiveName || '默认存档',
        existing.id
      )
    } else {
      db.prepare(
        `INSERT INTO make_sessions (user_id, design_id, current_step, finished_steps, step_mode, total_duration, archive_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        req.user.id,
        designId,
        currentStep ?? 0,
        finishedJson,
        stepMode || 'color',
        totalDuration || 0,
        archiveName || '默认存档'
      )
    }

    res.json(success({ saved: true }))
  } catch (err) {
    console.error('保存制作进度错误:', err)
    res.status(500).json(fail(500, '保存进度失败'))
  }
})

// POST /api/make/progress/finish — 标记制作完成
router.post('/make/progress/finish', authRequired, (req, res) => {
  try {
    const { designId, totalDuration } = req.body || {}

    if (!designId) {
      return res.status(400).json(fail(400, '缺少图纸 ID'))
    }

    // 获取设计信息（用于制作记录）
    const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(designId)
    if (!design) {
      return res.status(404).json(fail(404, '设计不存在'))
    }

    // 更新制作会话状态为已完成
    const session = db
      .prepare(
        'SELECT id FROM make_sessions WHERE user_id = ? AND design_id = ? AND status = ? LIMIT 1'
      )
      .get(req.user.id, designId, 'in_progress')

    if (session) {
      db.prepare(
        `UPDATE make_sessions SET status = 'completed', total_duration = ?,
          updated_at = datetime('now') WHERE id = ?`
      ).run(totalDuration || 0, session.id)
    }

    res.json(
      success({
        finished: true,
        designTitle: design.title,
        beadCount: design.bead_count,
        colorCount: design.color_count,
      })
    )
  } catch (err) {
    console.error('完成制作错误:', err)
    res.status(500).json(fail(500, '操作失败'))
  }
})

// GET /api/make/records — 获取制作记录列表
router.get('/make/records', authRequired, (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

    const rows = db
      .prepare(
        `SELECT ms.*, d.title as design_title, d.grid_width, d.grid_height,
          d.bead_count, d.color_count, d.thumbnail
         FROM make_sessions ms
         JOIN designs d ON ms.design_id = d.id
         WHERE ms.user_id = ? AND ms.status = 'completed'
         ORDER BY ms.updated_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(req.user.id, parseInt(limit), offset)

    const total = db
      .prepare(
        "SELECT COUNT(*) as c FROM make_sessions WHERE user_id = ? AND status = 'completed'"
      )
      .get(req.user.id)

    const list = rows.map((r) => ({
      id: r.id,
      designId: r.design_id,
      designTitle: r.design_title,
      gridWidth: r.grid_width,
      gridHeight: r.grid_height,
      beadCount: r.bead_count,
      colorCount: r.color_count,
      thumbnail: r.thumbnail,
      totalDuration: r.total_duration,
      archiveName: r.archive_name,
      finishedAt: r.updated_at,
    }))

    res.json(paginated(list, total.c, parseInt(page), parseInt(limit)))
  } catch (err) {
    console.error('获取制作记录错误:', err)
    res.status(500).json(fail(500, '获取记录失败'))
  }
})

// ============================================================
//  多存档管理
// ============================================================

// GET /api/make/archives/:designId — 获取存档列表
router.get('/make/archives/:designId', authRequired, (req, res) => {
  try {
    const archives = db
      .prepare(
        'SELECT id, archive_name as name, current_step, finished_steps, total_duration, updated_at FROM make_sessions WHERE user_id = ? AND design_id = ? ORDER BY archive_order ASC, updated_at DESC'
      )
      .all(req.user.id, req.params.designId)

    res.json(
      success({
        archives: archives.map((a) => ({
          id: a.id,
          name: a.name,
          currentStep: a.current_step,
          finishedSteps: JSON.parse(a.finished_steps || '[]'),
          totalDuration: a.total_duration,
          updatedAt: a.updated_at,
        })),
      })
    )
  } catch (err) {
    console.error('获取存档列表错误:', err)
    res.status(500).json(fail(500, '获取存档列表失败'))
  }
})

// POST /api/make/archives/save — 创建/更新存档
router.post('/make/archives/save', authRequired, (req, res) => {
  try {
    const { designId, archive } = req.body || {}
    if (!designId) return res.status(400).json(fail(400, '缺少图纸 ID'))

    // 创建新存档
    db.prepare(
      `INSERT INTO make_sessions (user_id, design_id, archive_name, current_step, finished_steps, step_mode, total_duration, archive_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(archive_order), 0) + 1 FROM make_sessions WHERE user_id = ? AND design_id = ?))`
    ).run(
      req.user.id,
      designId,
      archive?.name || '新存档',
      archive?.currentStep || 0,
      JSON.stringify(archive?.finishedSteps || []),
      archive?.stepMode || 'color',
      archive?.totalDuration || 0,
      req.user.id,
      designId
    )

    res.json(success({ created: true }))
  } catch (err) {
    console.error('创建存档错误:', err)
    res.status(500).json(fail(500, '创建存档失败'))
  }
})

// DELETE /api/make/archives/:archiveId — 删除存档
router.delete('/make/archives/:archiveId', authRequired, (req, res) => {
  try {
    const archiveId = parseInt(req.params.archiveId)
    if (!archiveId) return res.status(400).json(fail(400, '缺少存档 ID'))

    // 确保是这个用户的存档
    const archive = db
      .prepare('SELECT id FROM make_sessions WHERE id = ? AND user_id = ?')
      .get(archiveId, req.user.id)

    if (!archive) {
      return res.status(404).json(fail(404, '存档不存在'))
    }

    db.prepare('DELETE FROM make_sessions WHERE id = ?').run(archiveId)
    res.json(success({ deleted: true }))
  } catch (err) {
    console.error('删除存档错误:', err)
    res.status(500).json(fail(500, '删除存档失败'))
  }
})

// ============================================================
//  制作完成与库存扣减
// ============================================================

// POST /api/make/finish — 完成制作并写入制作记录
router.post('/make/finish', authRequired, (req, res) => {
  try {
    const { designId, totalDuration, lossRate } = req.body || {}

    if (!designId) return res.status(400).json(fail(400, '缺少图纸 ID'))

    const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(designId)
    if (!design) return res.status(404).json(fail(404, '设计不存在'))

    // 更新制作会话状态
    const session = db
      .prepare('SELECT id, step_mode FROM make_sessions WHERE user_id = ? AND design_id = ? AND status = ? LIMIT 1')
      .get(req.user.id, designId, 'in_progress')

    if (session) {
      db.prepare(
        `UPDATE make_sessions SET status = 'completed', total_duration = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(totalDuration || 0, session.id)
    }

    // 写入独立制作记录表
    const rate = lossRate ?? 0.05
    try {
      db.prepare(
        `INSERT INTO make_records (user_id, design_id, session_id, drawing_title, total_beans, color_count, duration, step_mode, loss_rate, deduct_stock, finish_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`
      ).run(
        req.user.id,
        designId,
        session?.id || null,
        design.title,
        design.bead_count || 0,
        design.color_count || 0,
        totalDuration || 0,
        session?.step_mode || 'color',
        rate
      )
    } catch {
      // make_records 表可能还未创建（迁移未执行），静默忽略
    }

    res.json(
      success({
        finished: true,
        designTitle: design.title,
        beadCount: design.bead_count,
        colorCount: design.color_count,
      })
    )
  } catch (err) {
    console.error('完成制作错误:', err)
    res.status(500).json(fail(500, '操作失败'))
  }
})

// POST /api/make/inventory/check — 检查库存是否充足
router.post('/make/inventory/check', authRequired, (req, res) => {
  try {
    const { designId, lossRate } = req.body || {}
    if (!designId) return res.status(400).json(fail(400, '缺少图纸 ID'))

    const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(designId)
    if (!design) return res.status(404).json(fail(404, '设计不存在'))

    const rate = lossRate ?? 0.05
    const gridData = JSON.parse(design.grid_data || '[]')

    // 统计每种颜色的用量
    const usage = new Map()
    for (const row of gridData) {
      if (!row) continue
      for (const cell of row) {
        if (!cell?.hex) continue
        const hex = cell.hex.toUpperCase()
        usage.set(hex, (usage.get(hex) || 0) + 1)
      }
    }

    // 检查库存
    const insufficient = []
    for (const [hex, count] of usage) {
      const needed = Math.ceil(count * (1 + rate))
      // 查找对应颜色
      const bead = db.prepare("SELECT id FROM bead_colors WHERE upper(hex) = ? LIMIT 1").get(hex)
      if (!bead) continue

      const inventory = db
        .prepare('SELECT quantity FROM user_bead_inventory WHERE user_id = ? AND color_id = ?')
        .get(req.user.id, bead.id)

      const available = inventory?.quantity || 0
      if (available < needed) {
        insufficient.push({
          hex,
          needed,
          available,
          shortage: needed - available,
        })
      }
    }

    res.json(
      success({
        sufficient: insufficient.length === 0,
        insufficient,
        totalColors: usage.size,
      })
    )
  } catch (err) {
    console.error('库存检查错误:', err)
    res.status(500).json(fail(500, '库存检查失败'))
  }
})

// ============================================================
//  制作统计
// ============================================================

// GET /api/make/stats/summary — 个人制作汇总
router.get('/make/stats/summary', authRequired, (req, res) => {
  try {
    const total = db
      .prepare("SELECT COUNT(*) as c FROM make_sessions WHERE user_id = ? AND status = 'completed'")
      .get(req.user.id)

    const totalDesigns = db
      .prepare('SELECT COUNT(DISTINCT design_id) as c FROM make_sessions WHERE user_id = ? AND status = ?')
      .get(req.user.id, 'completed')

    const totalDuration = db
      .prepare("SELECT COALESCE(SUM(total_duration), 0) as t FROM make_sessions WHERE user_id = ? AND status = 'completed'")
      .get(req.user.id)

    const totalBeads = db
      .prepare("SELECT COALESCE(SUM(bead_count), 0) as t FROM designs WHERE user_id = ?")
      .get(req.user.id)

    // 连续制作天数
    const streak = db
      .prepare(
        `WITH RECURSIVE dates(d) AS (
          SELECT date('now')
          UNION ALL SELECT date(d, '-1 day') FROM dates LIMIT 365
        )
        SELECT COUNT(*) as c FROM dates
        WHERE EXISTS (
          SELECT 1 FROM make_sessions
          WHERE user_id = ? AND status = 'completed' AND date(updated_at) = dates.d
        )`
      )
      .get(req.user.id)

    res.json(
      success({
        totalMakes: total.c,
        totalDesigns: totalDesigns.c,
        totalDuration: totalDuration.t,
        totalBeads: totalBeads.t,
        currentStreak: streak?.c || 0,
      })
    )
  } catch (err) {
    console.error('获取制作统计错误:', err)
    res.status(500).json(fail(500, '获取统计失败'))
  }
})

// ============================================================
//  设置同步
// ============================================================

// GET /api/make/settings — 获取云端设置
router.get('/make/settings', authRequired, (req, res) => {
  try {
    const row = db
      .prepare('SELECT * FROM user_make_settings WHERE user_id = ?')
      .get(req.user.id)

    if (!row) return res.json(success(null))

    res.json(
      success({
        displaySettings: JSON.parse(row.display_settings || '{}'),
        operationSettings: JSON.parse(row.operation_settings || '{}'),
        theme: row.theme || 'dark',
      })
    )
  } catch (err) {
    console.error('获取设置错误:', err)
    res.status(500).json(fail(500, '获取设置失败'))
  }
})

// POST /api/make/settings/save — 保存设置到云端
router.post('/make/settings/save', authRequired, (req, res) => {
  try {
    const { displaySettings, operationSettings, theme } = req.body || {}

    const existing = db
      .prepare('SELECT id FROM user_make_settings WHERE user_id = ?')
      .get(req.user.id)

    if (existing) {
      db.prepare(
        `UPDATE user_make_settings SET display_settings = ?, operation_settings = ?, theme = ?, updated_at = datetime('now') WHERE user_id = ?`
      ).run(
        JSON.stringify(displaySettings || {}),
        JSON.stringify(operationSettings || {}),
        theme || 'dark',
        req.user.id
      )
    } else {
      try {
        db.prepare(
          `INSERT INTO user_make_settings (user_id, display_settings, operation_settings, theme) VALUES (?, ?, ?, ?)`
        ).run(
          req.user.id,
          JSON.stringify(displaySettings || {}),
          JSON.stringify(operationSettings || {}),
          theme || 'dark'
        )
      } catch {
        // 表可能还未创建，静默忽略
      }
    }

    res.json(success({ saved: true }))
  } catch (err) {
    console.error('保存设置错误:', err)
    res.status(500).json(fail(500, '保存设置失败'))
  }
})

export default router
