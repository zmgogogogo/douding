// ============================================================
//  首页路由 — /api/home/init + /api/home/content/list
//  文档第五章：首页整体数据接口 + 内容流分页
// ============================================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authOptional } from '../middleware/auth.js'
import { formatDesign } from '../utils/helpers.js'

const router = Router()

// ============================================
//  GET /api/home/init — 首页整体数据
//  返回：Banner、工具入口、分类标签、首屏内容
// ============================================
router.get('/home/init', authOptional, (req, res) => {
  try {
    // Banner 列表（首版硬编码，后续从数据库/配置表读取）
    const banners = [
      {
        bgColor: '#22c55e',
        title: '欢迎来到豆丁',
        subtitle: '开始你的拼豆创作之旅',
        link: '/editor',
      },
      {
        bgColor: '#8b5cf6',
        title: 'Q版生成上线',
        subtitle: '一键生成Q版拼豆图纸',
        link: '/editor?mode=qstyle',
      },
    ]

    // 核心功能入口
    const mainTools = [
      {
        name: '图片转拼豆',
        icon: 'ImageIcon',
        bgColor: '#dcfce7',
        iconColor: '#16a34a',
        route: '/image-import',
      },
      {
        name: '空白创作',
        icon: 'PenIcon',
        bgColor: '#dbeafe',
        iconColor: '#2563eb',
        route: '/editor',
      },
      {
        name: 'Q版生成',
        icon: 'SparklesIcon',
        bgColor: '#fef3c7',
        iconColor: '#d97706',
        route: '/editor?mode=qstyle',
      },
      {
        name: '辅助拼豆',
        icon: 'Grid3X3Icon',
        bgColor: '#fce7f3',
        iconColor: '#db2777',
        route: '/editor?mode=assist',
      },
    ]

    // 快捷工具
    const quickTools = [
      { name: '文字转拼豆', icon: 'TypeIcon', route: '/editor?mode=text' },
      { name: '色板工具', icon: 'PaletteIcon', route: '/palette' },
      { name: '豆仓管理', icon: 'PackageIcon', route: '/warehouse' },
      { name: '找色助手', icon: 'ScanIcon', route: '/color-finder' },
      { name: '尺寸计算', icon: 'CalculatorIcon', route: '/calculator' },
      { name: '制作教程', icon: 'BookOpenIcon', route: '/tutorials' },
      { name: '图纸打印', icon: 'PrinterIcon', route: '/print' },
      { name: '更多工具', icon: 'MoreHorizontalIcon', route: '/tools' },
    ]

    // 分类标签
    const categoryTabs = [
      { key: 'recommend', label: '推荐' },
      { key: 'popular', label: '热门' },
      { key: 'template', label: '模板' },
      { key: 'works', label: '作品' },
      { key: 'tutorial', label: '教程' },
      { key: 'activity', label: '活动' },
    ]

    // 首屏内容（取第一页 20 条）
    const designs = db
      .prepare(
        `
      SELECT d.*, u.username, u.nickname, u.avatar
      FROM designs d JOIN users u ON d.user_id = u.id
      WHERE d.is_public = 1
      ORDER BY d.likes_count DESC
      LIMIT 20
    `
      )
      .all()

    const total = db.prepare('SELECT COUNT(*) as c FROM designs WHERE is_public = 1').get()

    res.json({
      code: 200,
      data: {
        banners,
        mainTools,
        quickTools,
        categoryTabs,
        contentList: designs.map((d) => ({
          ...formatDesign(d),
          type: 'works',
          author: {
            id: d.user_id,
            username: d.username,
            nickname: d.nickname || d.username,
            avatar: d.avatar,
          },
        })),
        total: total.c,
      },
    })
  } catch (err) {
    console.error('首页初始化失败:', err)
    res.status(500).json({ code: 500, message: '服务器异常，请稍后重试' })
  }
})

// ============================================
//  GET /api/home/content/list — 内容流分页
//  参数：category, page, limit, sort
// ============================================
router.get('/home/content/list', authOptional, (req, res) => {
  try {
    const { category = 'recommend', page = 1, limit = 20 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

    // 分类到排序的映射
    const sortMap = {
      recommend: 'd.likes_count DESC',
      popular: 'd.likes_count DESC',
      template: 'd.updated_at DESC',
      works: 'd.likes_count DESC, d.updated_at DESC',
      tutorial: 'd.views_count DESC',
      activity: 'd.updated_at DESC',
    }
    const orderBy = sortMap[category] || 'd.likes_count DESC'

    const designs = db
      .prepare(
        `
      SELECT d.*, u.username, u.nickname, u.avatar
      FROM designs d JOIN users u ON d.user_id = u.id
      WHERE d.is_public = 1
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `
      )
      .all(parseInt(limit), offset)

    const total = db.prepare('SELECT COUNT(*) as c FROM designs WHERE is_public = 1').get()

    res.json({
      code: 200,
      data: {
        list: designs.map((d) => ({
          ...formatDesign(d),
          type: 'works',
          author: {
            id: d.user_id,
            username: d.username,
            nickname: d.nickname || d.username,
            avatar: d.avatar,
          },
        })),
        total: total.c,
        hasMore: offset + designs.length < total.c,
      },
    })
  } catch (err) {
    console.error('首页内容加载失败:', err)
    res.status(500).json({ code: 500, message: '服务器异常，请稍后重试' })
  }
})

export default router
