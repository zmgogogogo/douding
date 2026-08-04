// ============================================================
//  useProgress.js — 拼豆制作模式进度管理
//  多存档、localStorage + 服务端双写、离线同步、冲突处理
// ============================================================
import { ref, computed } from 'vue'
import API from '@/api/index.js'

// 模块级共享状态
const archives = ref([]) // [{id, name, designId, currentStep, finishedSteps, totalDuration, updatedAt}]
const activeArchiveId = ref(null)
const activeArchiveName = ref('默认存档')
const elapsed = ref(0)
const startedAt = ref(null)
const isSaving = ref(false)
const isOnline = ref(navigator.onLine)
const offlineQueue = ref([])
const hasConflict = ref(false)
const conflictData = ref(null)

// 监听网络状态
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline.value = true
    flushOfflineQueue()
  })
  window.addEventListener('offline', () => {
    isOnline.value = false
  })
}

export function useProgress() {
  let elapsedTimer = null

  /**
   * 开始计时
   */
  function startTimer() {
    startedAt.value = Date.now()
    elapsedTimer = setInterval(() => {
      elapsed.value++
    }, 1000)
  }

  /**
   * 停止计时
   */
  function stopTimer() {
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }
  }

  /**
   * 格式化时长
   */
  function formatDuration(sec) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    if (h > 0) return `${h}小时${m}分${s}秒`
    if (m > 0) return `${m}分${s}秒`
    return `${s}秒`
  }

  // ========== 进度保存 ==========

  /**
   * 构建进度数据
   */
  function buildProgressData(designId, currentIdx, finishedSteps, stepMode) {
    return {
      designId,
      currentStep: currentIdx,
      finishedSteps: Array.from(finishedSteps || []),
      stepMode: stepMode || 'color',
      totalDuration: elapsed.value,
      archiveName: activeArchiveName.value,
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * 保存进度到 localStorage
   */
  function saveToLocal(designId, data) {
    const key = `make_progress_${designId}_${activeArchiveId.value || 'default'}`
    localStorage.setItem(key, JSON.stringify(data))
  }

  /**
   * 从 localStorage 加载进度
   */
  function loadFromLocal(designId) {
    const key = `make_progress_${designId}_${activeArchiveId.value || 'default'}`
    const raw = localStorage.getItem(key)
    if (raw) {
      try {
        return JSON.parse(raw)
      } catch {
        return null
      }
    }
    return null
  }

  /**
   * 保存进度（双写：localStorage + 服务端）
   */
  async function saveProgress(designId, currentIdx, finishedSteps, stepMode) {
    isSaving.value = true
    const data = buildProgressData(designId, currentIdx, finishedSteps, stepMode)

    // 总是先保存到本地
    saveToLocal(designId, data)

    // 在线则异步保存到服务端
    if (isOnline.value) {
      try {
        const res = await API.post('/api/make/progress/save', {
          ...data,
          archiveId: activeArchiveId.value,
        })

        // 检查冲突
        if (res.data?.conflict) {
          hasConflict.value = true
          conflictData.value = res.data
        } else {
          hasConflict.value = false
          conflictData.value = null
        }
      } catch {
        // 添加到离线队列
        offlineQueue.value.push({ ...data, designId })
      }
    } else {
      // 离线时加入队列
      offlineQueue.value.push({ ...data, designId })
    }

    isSaving.value = false
  }

  /**
   * 从服务端加载进度
   */
  async function loadFromServer(designId) {
    try {
      const res = await API.get('/api/make/progress/' + designId)
      if (res.data?.finishedSteps) {
        return {
          currentIdx: res.data.currentStep || 0,
          finishedSteps: new Set(res.data.finishedSteps || []),
          elapsed: res.data.totalDuration || 0,
          archiveName: res.data.archiveName || '默认存档',
          archiveId: res.data.id || null,
          updatedAt: res.data.updatedAt,
        }
      }
    } catch {
      // 离线时忽略
    }
    return null
  }

  /**
   * 合并本地和服务端进度
   */
  async function loadProgress(designId) {
    // 先从本地加载
    const localData = loadFromLocal(designId)

    // 再从服务端加载（在线时）
    const serverData = await loadFromServer(designId)

    if (serverData && localData) {
      // 比较时间戳，以最新的为准
      const localTime = new Date(localData.updatedAt || 0).getTime()
      const serverTime = new Date(serverData.updatedAt || 0).getTime()

      if (serverTime > localTime) {
        // 服务端更新，使用服务端
        activeArchiveName.value = serverData.archiveName
        activeArchiveId.value = serverData.archiveId
        return {
          currentIdx: serverData.currentIdx,
          finishedSteps: serverData.finishedSteps,
          elapsed: serverData.elapsed,
        }
      }
    }

    if (serverData && !localData) {
      activeArchiveName.value = serverData.archiveName
      activeArchiveId.value = serverData.archiveId
      return {
        currentIdx: serverData.currentIdx,
        finishedSteps: serverData.finishedSteps,
        elapsed: serverData.elapsed,
      }
    }

    if (localData) {
      return {
        currentIdx: localData.currentStep || 0,
        finishedSteps: new Set(localData.finishedSteps || []),
        elapsed: localData.totalDuration || 0,
      }
    }

    return null
  }

  /**
   * 清除进度
   */
  function clearProgress(designId) {
    const key = `make_progress_${designId}_${activeArchiveId.value || 'default'}`
    localStorage.removeItem(key)
    elapsed.value = 0
    startedAt.value = null
  }

  // ========== 多存档管理 ==========

  /**
   * 加载存档列表
   */
  async function loadArchives(designId) {
    try {
      const res = await API.get('/api/make/archives/' + designId)
      if (res.data?.archives) {
        archives.value = res.data.archives
      }
    } catch {
      // 离线时从 localStorage 读取存档列表
      const localArchives = localStorage.getItem(`make_archives_${designId}`)
      if (localArchives) {
        try {
          archives.value = JSON.parse(localArchives)
        } catch { /* ignore */ }
      }
    }
    return archives.value
  }

  /**
   * 创建新存档
   */
  async function createArchive(designId, name) {
    const archive = {
      id: Date.now(),
      name: name || `存档 ${archives.value.length + 1}`,
      designId,
      currentStep: 0,
      finishedSteps: [],
      totalDuration: 0,
      updatedAt: new Date().toISOString(),
    }

    archives.value = [...archives.value, archive]

    // 保存存档列表到本地
    localStorage.setItem(`make_archives_${designId}`, JSON.stringify(archives.value))

    // 同步到服务端
    if (isOnline.value) {
      try {
        await API.post('/api/make/archives/save', { designId, archive })
      } catch { /* ignore */ }
    }

    return archive
  }

  /**
   * 切换存档
   */
  async function switchArchive(designId, archive) {
    // 先保存当前进度
    await saveProgress(designId, 0, new Set(), 'color')

    activeArchiveId.value = archive.id
    activeArchiveName.value = archive.name

    // 加载新存档的进度
    const progress = await loadProgress(designId)
    return progress
  }

  /**
   * 删除存档
   */
  async function deleteArchive(designId, archiveId) {
    archives.value = archives.value.filter((a) => a.id !== archiveId)
    localStorage.setItem(`make_archives_${designId}`, JSON.stringify(archives.value))

    // 同时清除存档关联的进度
    const progressKey = `make_progress_${designId}_${archiveId}`
    localStorage.removeItem(progressKey)

    if (isOnline.value) {
      try {
        await API.del('/api/make/archives/' + archiveId)
      } catch { /* ignore */ }
    }
  }

  /**
   * 重命名存档
   */
  function renameArchive(designId, archiveId, newName) {
    archives.value = archives.value.map((a) =>
      a.id === archiveId ? { ...a, name: newName } : a
    )
    localStorage.setItem(`make_archives_${designId}`, JSON.stringify(archives.value))

    if (archiveId === activeArchiveId.value) {
      activeArchiveName.value = newName
    }
  }

  // ========== 离线同步 ==========

  /**
   * 刷新离线队列
   */
  async function flushOfflineQueue() {
    if (!isOnline.value || offlineQueue.value.length === 0) return

    const queue = [...offlineQueue.value]
    offlineQueue.value = []

    for (const item of queue) {
      try {
        await API.post('/api/make/progress/save', item)
      } catch {
        // 失败的重新加入队列
        offlineQueue.value.push(item)
      }
    }
  }

  // ========== 完成标记 ==========

  /**
   * 标记制作完成
   */
  async function finishMake(designId, lossRate = 5) {
    try {
      const res = await API.post('/api/make/progress/finish', {
        designId,
        totalDuration: elapsed.value,
        lossRate,
      })
      clearProgress(designId)
      return res.data
    } catch (e) {
      console.error('完成制作失败:', e)
      return null
    }
  }

  /**
   * 获取制作记录列表
   */
  async function getRecords(page = 1, limit = 20) {
    try {
      const res = await API.get(`/api/make/records?page=${page}&limit=${limit}`)
      return res.data
    } catch {
      return { list: [], total: 0 }
    }
  }

  return {
    // 状态
    archives,
    activeArchiveId,
    activeArchiveName,
    elapsed,
    startedAt,
    isSaving,
    isOnline,
    hasConflict,
    conflictData,

    // 计时
    startTimer,
    stopTimer,
    formatDuration,

    // 进度
    buildProgressData,
    saveToLocal,
    loadFromLocal,
    saveProgress,
    loadFromServer,
    loadProgress,
    clearProgress,

    // 存档
    loadArchives,
    createArchive,
    switchArchive,
    deleteArchive,
    renameArchive,

    // 同步
    flushOfflineQueue,

    // 完成
    finishMake,
    getRecords,
  }
}
