// ============================================
//  文件夹管理路由（try-catch 安全加固）
// ============================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authRequired } from '../middleware/auth.js'
import { success, fail } from '../utils/response.js'

const router = Router()

router.get('/folders', authRequired, (req, res) => {
  try {
    const folders = db.prepare(
      `SELECT f.*, (SELECT COUNT(*) FROM designs d WHERE d.folder_id = f.id) as design_count
      FROM folders f WHERE f.user_id = ? ORDER BY f.sort_order`
    ).all(req.user.id)
    res.json(success(folders))
  } catch (err) {
    console.error('获取文件夹错误:', err)
    res.status(500).json(fail(500, '获取文件夹失败'))
  }
})

router.post('/folders', authRequired, (req, res) => {
  try {
    const { name } = req.body || {}
    if (!name) return res.status(400).json(fail(400, '请输入文件夹名称'))
    const result = db.prepare('INSERT INTO folders (user_id, name) VALUES (?, ?)')
      .run(req.user.id, name)
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(result.lastInsertRowid)
    res.json(success(folder))
  } catch (err) {
    console.error('创建文件夹错误:', err)
    res.status(500).json(fail(500, '创建文件夹失败'))
  }
})

router.put('/folders/:id', authRequired, (req, res) => {
  try {
    const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id)
    if (!folder) return res.status(404).json(fail(404, '文件夹不存在'))
    const { name } = req.body || {}
    db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name || folder.name, folder.id)
    res.json(success({ ...folder, name: name || folder.name }))
  } catch (err) {
    console.error('更新文件夹错误:', err)
    res.status(500).json(fail(500, '更新文件夹失败'))
  }
})

router.delete('/folders/:id', authRequired, (req, res) => {
  try {
    const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id)
    if (!folder) return res.status(404).json(fail(404, '文件夹不存在'))
    db.prepare('UPDATE designs SET folder_id = NULL WHERE folder_id = ?').run(folder.id)
    db.prepare('DELETE FROM folders WHERE id = ?').run(folder.id)
    res.json(success(null))
  } catch (err) {
    console.error('删除文件夹错误:', err)
    res.status(500).json(fail(500, '删除文件夹失败'))
  }
})

export default router
