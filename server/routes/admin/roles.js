// ============================================
//  角色管理路由 — CRUD + 权限配置
// ============================================
import { Router } from 'express'
import db from '../../db/connection.js'
import { adminRequired } from '../../middleware/adminAuth.js'
import { success, fail, paginated } from '../../utils/response.js'
import { logAction } from '../../services/admin/logService.js'

const router = Router()

// 角色列表
router.get('/', adminRequired, (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

    const total = db.prepare('SELECT COUNT(*) as c FROM sys_roles').get()
    const list = db.prepare(
      `SELECT r.*, (SELECT COUNT(*) FROM sys_admins WHERE role_id = r.id) as admin_count
       FROM sys_roles r ORDER BY r.id ASC LIMIT ? OFFSET ?`
    ).all(parseInt(limit), offset)

    const enriched = list.map((r) => ({
      ...r,
      permissions: safeJson(r.permissions),
    }))

    res.json(paginated(enriched, total.c, parseInt(page), parseInt(limit)))
  } catch (err) {
    console.error('获取角色列表错误:', err)
    res.status(500).json(fail(500, '获取角色列表失败'))
  }
})

// 所有角色（下拉选项用）
router.get('/all', adminRequired, (req, res) => {
  try {
    const list = db.prepare('SELECT id, name, slug FROM sys_roles WHERE status = 1 ORDER BY id').all()
    res.json(success(list))
  } catch (err) {
    res.status(500).json(fail(500, '获取角色列表失败'))
  }
})

// 新增角色
router.post('/', adminRequired, (req, res) => {
  try {
    const { name, slug, description, permissions } = req.body || {}
    if (!name || !slug) return res.status(400).json(fail(400, '请输入角色名称和标识'))

    const existing = db.prepare('SELECT id FROM sys_roles WHERE slug = ?').get(slug)
    if (existing) return res.status(409).json(fail(409, '角色标识已存在'))

    const perms = Array.isArray(permissions) ? JSON.stringify(permissions) : '[]'
    const result = db.prepare(
      'INSERT INTO sys_roles (name, slug, description, permissions) VALUES (?, ?, ?, ?)'
    ).run(name, slug, description || '', perms)

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '权限管理', action: 'create', targetType: 'role', targetId: result.lastInsertRowid,
      detail: JSON.stringify({ name, slug }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    const role = db.prepare('SELECT * FROM sys_roles WHERE id = ?').get(result.lastInsertRowid)
    res.json(success({ ...role, permissions: safeJson(role.permissions) }))
  } catch (err) {
    console.error('创建角色错误:', err)
    res.status(500).json(fail(500, '创建角色失败'))
  }
})

// 更新角色
router.put('/:id', adminRequired, (req, res) => {
  try {
    const role = db.prepare('SELECT * FROM sys_roles WHERE id = ?').get(req.params.id)
    if (!role) return res.status(404).json(fail(404, '角色不存在'))

    const { name, description, permissions } = req.body || {}
    const perms = Array.isArray(permissions) ? JSON.stringify(permissions) : role.permissions

    db.prepare(
      `UPDATE sys_roles SET name = ?, description = ?, permissions = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      name !== undefined ? name : role.name,
      description !== undefined ? description : role.description,
      perms,
      role.id
    )

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '权限管理', action: 'update', targetType: 'role', targetId: role.id,
      detail: JSON.stringify({ name }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    res.json(success({ id: role.id }))
  } catch (err) {
    console.error('更新角色错误:', err)
    res.status(500).json(fail(500, '更新角色失败'))
  }
})

// 删除角色
router.delete('/:id', adminRequired, (req, res) => {
  try {
    const role = db.prepare('SELECT * FROM sys_roles WHERE id = ?').get(req.params.id)
    if (!role) return res.status(404).json(fail(404, '角色不存在'))

    // 检查是否有关联的管理员
    const adminCount = db.prepare('SELECT COUNT(*) as c FROM sys_admins WHERE role_id = ?').get(role.id).c
    if (adminCount > 0) {
      return res.status(400).json(fail(400, `该角色下还有 ${adminCount} 个管理员，请先转移后再删除`))
    }

    db.prepare('DELETE FROM sys_roles WHERE id = ?').run(role.id)

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '权限管理', action: 'delete', targetType: 'role', targetId: role.id,
      detail: JSON.stringify({ name: role.name }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    res.json(success(null))
  } catch (err) {
    console.error('删除角色错误:', err)
    res.status(500).json(fail(500, '删除角色失败'))
  }
})

// 权限树结构（用于角色编辑）
router.get('/permissions-tree', adminRequired, (req, res) => {
  try {
    const tree = [
      {
        key: 'dashboard', label: '数据看板',
        children: [{ key: 'admin:dashboard:read', label: '查看看板' }],
      },
      {
        key: 'users', label: '用户管理',
        children: [
          { key: 'admin:users:read', label: '查看用户' },
          { key: 'admin:users:write', label: '编辑用户' },
          { key: 'admin:users:ban', label: '封禁/解封' },
        ],
      },
      {
        key: 'content', label: '内容管理',
        children: [
          { key: 'admin:designs:read', label: '查看设计' },
          { key: 'admin:designs:write', label: '编辑设计' },
          { key: 'admin:designs:delete', label: '删除设计' },
          { key: 'admin:designs:review', label: '审核设计' },
        ],
      },
      {
        key: 'palette', label: '色板物料',
        children: [
          { key: 'admin:palette:read', label: '查看色板' },
          { key: 'admin:palette:write', label: '编辑色板' },
        ],
      },
      {
        key: 'operations', label: '运营管理',
        children: [
          { key: 'admin:banners:read', label: '查看Banner' },
          { key: 'admin:banners:write', label: '编辑Banner' },
        ],
      },
      {
        key: 'permissions', label: '权限管理',
        children: [
          { key: 'admin:permissions:read', label: '查看管理员/角色' },
          { key: 'admin:permissions:write', label: '管理管理员/角色' },
        ],
      },
      {
        key: 'logs', label: '操作日志',
        children: [{ key: 'admin:logs:read', label: '查看日志' }],
      },
    ]
    res.json(success(tree))
  } catch (err) {
    res.status(500).json(fail(500, '获取权限树失败'))
  }
})

function safeJson(str) {
  try { return JSON.parse(str || '[]') } catch { return [] }
}

export default router
