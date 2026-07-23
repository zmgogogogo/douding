// ============================================
//  转图结果缓存服务 — 文件缓存 7 天
//  相同图片 + 相同参数 → 直接返回缓存结果
//  文档规范：减少重复计算，节省算力
// ============================================
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CACHE_DIR = path.join(__dirname, '..', '..', '.cache', 'convert')
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 天（文档规范）
const CLEANUP_INTERVAL = 60 * 60 * 1000 // 每小时清理一次过期缓存

// 确保缓存目录存在
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
}

/**
 * 计算请求的哈希键
 * 基于图片内容 + 所有转换参数
 */
export function computeCacheKey(filePath, params) {
  const hash = crypto.createHash('sha256')

  // 图片文件内容哈希
  try {
    const fileBuffer = fs.readFileSync(filePath)
    hash.update(fileBuffer)
  } catch {
    // 文件读取失败，用路径+时间戳降级
    hash.update(filePath)
    hash.update(String(Date.now()))
  }

  // 参数序列化（排序确保一致性）
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  hash.update(sortedParams)

  return hash.digest('hex')
}

/**
 * 获取缓存结果
 * @param {string} cacheKey - 缓存键
 * @returns {object|null} 缓存数据，或 null
 */
export function getCached(cacheKey) {
  try {
    const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`)
    if (!fs.existsSync(cacheFile)) return null

    const stat = fs.statSync(cacheFile)
    // 检查是否过期
    if (Date.now() - stat.mtimeMs > CACHE_TTL) {
      fs.unlinkSync(cacheFile) // 删除过期缓存
      return null
    }

    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    console.log(
      `  💾 缓存命中: ${cacheKey.slice(0, 12)}... (${Math.round((Date.now() - stat.mtimeMs) / 3600000)}小时前)`
    )
    return data
  } catch {
    return null
  }
}

/**
 * 保存结果到缓存
 * @param {string} cacheKey - 缓存键
 * @param {object} data - 结果数据
 */
export function setCached(cacheKey, data) {
  try {
    const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`)
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2))
    console.log(`  📦 缓存已保存: ${cacheKey.slice(0, 12)}...`)
  } catch (e) {
    console.warn('缓存保存失败:', e.message)
  }
}

/**
 * 清理过期缓存（定期调用）
 */
export function cleanupExpiredCache() {
  try {
    const files = fs.readdirSync(CACHE_DIR)
    const now = Date.now()
    let cleaned = 0

    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const filePath = path.join(CACHE_DIR, file)
      try {
        const stat = fs.statSync(filePath)
        if (now - stat.mtimeMs > CACHE_TTL) {
          fs.unlinkSync(filePath)
          cleaned++
        }
      } catch {
        /* 跳过无法访问的文件 */
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 缓存清理: ${cleaned} 个过期文件`)
    }
  } catch {
    /* 缓存目录可能不存在 */
  }
}

// ============================================
//  异步任务状态管理
//  文档规范：/api/convert/smart-submit + /api/convert/status
// ============================================

/** @type {Map<string, {status: string, progress: number, result?: object, error?: string, createdAt: number}>} */
const taskStore = new Map()
const TASK_TTL = 30 * 60 * 1000 // 任务状态保留 30 分钟

/**
 * 创建异步任务
 * @param {string} taskId - 任务 ID
 */
export function createTask(taskId) {
  taskStore.set(taskId, {
    status: 'pending',
    progress: 0,
    createdAt: Date.now(),
  })
}

/**
 * 更新任务状态
 */
export function updateTask(taskId, update) {
  const task = taskStore.get(taskId)
  if (!task) return
  Object.assign(task, update)
}

/**
 * 获取任务状态
 */
export function getTask(taskId) {
  const task = taskStore.get(taskId)
  if (!task) return null
  // 清理超时任务
  if (Date.now() - task.createdAt > TASK_TTL) {
    taskStore.delete(taskId)
    return null
  }
  return task
}

// 定期清理过期任务
setInterval(() => {
  const now = Date.now()
  for (const [id, task] of taskStore) {
    if (now - task.createdAt > TASK_TTL) {
      taskStore.delete(id)
    }
  }
}, CLEANUP_INTERVAL)

// 定期清理过期缓存
setInterval(cleanupExpiredCache, CLEANUP_INTERVAL)
// 启动时执行一次清理
cleanupExpiredCache()
