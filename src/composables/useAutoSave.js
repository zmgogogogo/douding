/**
 * IndexedDB 自动保存 — 替换 localStorage
 *
 * 核心功能：
 * - 支持多草稿存储（不受 5MB 限制）
 * - 崩溃恢复：页面异常关闭后自动检测并提示恢复
 * - 存储容量监控
 * - 与现有 API 兼容的接口
 */

const DB_NAME = 'douding-editor'
const DB_VERSION = 1
const STORE_NAME = 'autosave'

/** @type {IDBDatabase|null} */
let db = null

/**
 * 打开/初始化数据库
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db)

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const database = /** @type {IDBDatabase} */ (e.target.result)
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }

    request.onsuccess = (e) => {
      db = /** @type {IDBDatabase} */ (e.target.result)
      resolve(db)
    }

    request.onerror = (e) => {
      console.error('[AutoSave] IndexedDB 打开失败，降级到 localStorage', e.target.error)
      db = null
      reject(e.target.error)
    }
  })
}

/**
 * 保存草稿
 * @param {string} key — 草稿标识（如 'autosave_v3'）
 * @param {object} data — 完整草稿数据
 * @returns {Promise<void>}
 */
export async function saveDraft(key, data) {
  try {
    const database = await openDB()
    const tx = database.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    const record = {
      key,
      data,
      updatedAt: Date.now(),
      // 存储元信息，方便草稿列表展示
      title: data.title || '未命名',
      gridSize: data.gridW ? `${data.gridW}×${data.gridH}` : '',
    }

    store.put(record)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
    })
  } catch (e) {
    // 降级到 localStorage
    console.warn('[AutoSave] IndexedDB 写入失败，尝试 localStorage', e)
    try {
      localStorage.setItem(`douding_${key}`, JSON.stringify(data))
    } catch (e2) {
      console.error('[AutoSave] localStorage 也失败了', e2)
    }
  }
}

/**
 * 读取草稿
 * @param {string} key
 * @returns {Promise<object|null>}
 */
export async function loadDraft(key) {
  try {
    const database = await openDB()
    const tx = database.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => {
        resolve(request.result ? request.result.data : null)
      }
      request.onerror = (e) => reject(e.target.error)
    })
  } catch (e) {
    // 降级到 localStorage
    console.warn('[AutoSave] IndexedDB 读取失败，尝试 localStorage', e)
    try {
      const raw = localStorage.getItem(`douding_${key}`)
      return raw ? JSON.parse(raw) : null
    } catch (e2) {
      return null
    }
  }
}

/**
 * 删除草稿
 * @param {string} key
 */
export async function deleteDraft(key) {
  try {
    const database = await openDB()
    const tx = database.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(key)
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
    })
  } catch (e) {
    try {
      localStorage.removeItem(`douding_${key}`)
    } catch (e2) {
      /* 静默忽略 */
    }
  }
}

/**
 * 列出所有草稿（用于恢复界面）
 * @returns {Promise<Array<{key:string, title:string, gridSize:string, updatedAt:number}>>}
 */
export async function listDrafts() {
  try {
    const database = await openDB()
    const tx = database.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const drafts = (request.result || [])
          .map((r) => ({
            key: r.key,
            title: r.title || r.data?.title || '未命名',
            gridSize: r.gridSize || (r.data?.gridW ? `${r.data.gridW}×${r.data.gridH}` : ''),
            updatedAt: r.updatedAt || 0,
          }))
          .sort((a, b) => b.updatedAt - a.updatedAt)
        resolve(drafts)
      }
      request.onerror = (e) => reject(e.target.error)
    })
  } catch (e) {
    return []
  }
}

/**
 * 检测崩溃恢复（页面加载时调用）
 * @param {string} key — 当前编辑器的草稿 key
 * @returns {Promise<{hasDraft: boolean, data: object|null}>}
 */
export async function checkCrashRecovery(key) {
  try {
    const draft = await loadDraft(key)
    if (draft && draft.grid && draft.grid.length > 0) {
      return { hasDraft: true, data: draft }
    }
    return { hasDraft: false, data: null }
  } catch (e) {
    return { hasDraft: false, data: null }
  }
}

/**
 * 获取存储使用情况
 * @returns {Promise<{usage: number, quota: number, percent: number}>}
 */
export async function getStorageUsage() {
  try {
    const estimate = await navigator.storage?.estimate()
    if (estimate) {
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percent: estimate.quota ? Math.round((estimate.usage / estimate.quota) * 100) : 0,
      }
    }
  } catch (e) {
    /* 静默忽略 */
  }
  return { usage: 0, quota: 0, percent: 0 }
}
