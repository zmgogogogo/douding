// ============================================
//  文件夹管理路由
// ============================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authRequired } from '../middleware/auth.js'

const router = Router()

router.get('/folders', authRequired, (req, res) => {
  const folders = db
    .prepare(
      `
    SELECT f.*, (SELECT COUNT(*) FROM designs d WHERE d.folder_id = f.id) as design_count
    FROM folders f WHERE f.user_id = ? ORDER BY f.sort_order
  `
    )
    .all(req.user.id)
  res.json({ code: 200, data: folders })
})

router.post('/folders', authRequired, (req, res) => {
  const { name } = req.body || {}
  if (!name) return res.status(400).json({ code: 400, message: '请输入文件夹名称' })
  const result = db
    .prepare('INSERT INTO folders (user_id, name) VALUES (?, ?)')
    .run(req.user.id, name)
  const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(result.lastInsertRowid)
  res.json({ code: 200, data: folder })
})

router.put('/folders/:id', authRequired, (req, res) => {
  const folder = db
    .prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id)
  if (!folder) return res.status(404).json({ code: 404, message: '文件夹不存在' })
  const { name } = req.body || {}
  db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name || folder.name, folder.id)
  res.json({ code: 200, data: { ...folder, name: name || folder.name } })
})

router.delete('/folders/:id', authRequired, (req, res) => {
  const folder = db
    .prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id)
  if (!folder) return res.status(404).json({ code: 404, message: '文件夹不存在' })
  db.prepare('UPDATE designs SET folder_id = NULL WHERE folder_id = ?').run(folder.id)
  db.prepare('DELETE FROM folders WHERE id = ?').run(folder.id)
  res.json({ code: 200, message: '已删除' })
})

export default router
