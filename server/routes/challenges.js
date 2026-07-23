// ============================================
//  每日挑战路由 — 主题创作挑战
// ============================================
import { Router } from 'express'
import { authOptional } from '../middleware/auth.js'
import db from '../db/connection.js'

const router = Router()

// 挑战主题库（中英文混合，覆盖各种难度）
const THEMES = [
  { zh: '可爱小动物', en: 'Cute Animal' },
  { zh: '水果', en: 'Fruit' },
  { zh: '像素表情', en: 'Pixel Emoji' },
  { zh: '花朵', en: 'Flower' },
  { zh: '太空', en: 'Space' },
  { zh: '海洋生物', en: 'Ocean Life' },
  { zh: '甜品', en: 'Dessert' },
  { zh: '像素字体', en: 'Pixel Font' },
  { zh: '交通工具', en: 'Vehicle' },
  { zh: '天气', en: 'Weather' },
  { zh: '蘑菇', en: 'Mushroom' },
  { zh: '机器人', en: 'Robot' },
  { zh: '星星', en: 'Star' },
  { zh: '圣诞', en: 'Christmas' },
  { zh: '万圣节', en: 'Halloween' },
  { zh: '爱心', en: 'Heart' },
  { zh: '城堡', en: 'Castle' },
  { zh: '恐龙', en: 'Dinosaur' },
  { zh: '寿司', en: 'Sushi' },
  { zh: '游戏手柄', en: 'Game Controller' },
  { zh: '独角兽', en: 'Unicorn' },
  { zh: '彩虹', en: 'Rainbow' },
  { zh: '冰淇淋', en: 'Ice Cream' },
  { zh: '小鸟', en: 'Bird' },
  { zh: '蝴蝶', en: 'Butterfly' },
  { zh: '仙人掌', en: 'Cactus' },
  { zh: '月亮', en: 'Moon' },
  { zh: '王冠', en: 'Crown' },
  { zh: '猫', en: 'Cat' },
  { zh: '狗', en: 'Dog' },
  { zh: '熊猫', en: 'Panda' },
  { zh: '兔子', en: 'Rabbit' },
]

// 根据日期确定性选主题（每天同一主题）
function getDailyTheme() {
  const now = new Date()
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  return THEMES[dayOfYear % THEMES.length]
}

// 获取今日挑战
router.get('/challenge/today', authOptional, (req, res) => {
  const theme = getDailyTheme()
  res.json({
    code: 200,
    data: {
      ...theme,
      date: new Date().toISOString().slice(0, 10),
      // 今日已有投稿数
      submissionCount:
        db
          .prepare(
            `SELECT COUNT(*) as c FROM designs WHERE is_public = 1 AND DATE(created_at) = DATE('now')`
          )
          .get()?.c || 0,
    },
  })
})

// 挑战主题列表（未来7天）
router.get('/challenges/upcoming', authOptional, (req, res) => {
  const now = new Date()
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  const upcoming = []
  for (let i = 0; i < 7; i++) {
    const theme = THEMES[(dayOfYear + i) % THEMES.length]
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    upcoming.push({ ...theme, date: d.toISOString().slice(0, 10) })
  }
  res.json({ code: 200, data: upcoming })
})

export default router
