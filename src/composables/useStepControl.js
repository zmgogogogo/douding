// ============================================================
//  useStepControl.js — 拼豆制作模式步骤控制逻辑
//  支持按颜色 / 按区域 / 按图层三种分步模式
// ============================================================
import { ref, computed } from 'vue'
import {
  generateColorSteps,
  generateRegionSteps,
  generateLayerSteps,
} from '@/utils/stepGenerator.js'

// 模块级共享状态
const stepMode = ref('color') // 'color' | 'region' | 'layer'
const colorSort = ref('desc') // 'desc' | 'asc' | 'hue'
const regionCols = ref(3)
const regionRows = ref(3)
const autoLayerCount = ref(3)
const steps = ref([])
const currentIdx = ref(0)
const finishedSet = ref(new Set())
const autoPlay = ref(false)
const autoPlaySpeed = ref(3000) // ms
const autoNext = ref(false)
let autoPlayTimer = null

export function useStepControl() {
  // 计算属性
  const totalSteps = computed(() => steps.value.length)
  const currentStep = computed(() => steps.value[currentIdx.value] || null)
  const hasPrev = computed(() => currentIdx.value > 0)
  const hasNext = computed(() => currentIdx.value < totalSteps.value - 1)
  const isAllDone = computed(() => finishedSet.value.size >= totalSteps.value && totalSteps.value > 0)
  const finishedCount = computed(() => finishedSet.value.size)
  const progress = computed(() => {
    if (!totalSteps.value) return 0
    return Math.round((finishedSet.value.size / totalSteps.value) * 100)
  })

  /**
   * 生成步骤数据
   * @param {Array<Array>} gridData — 图纸网格数据
   * @param {number} gridW — 图纸宽度
   * @param {number} gridH — 图纸高度
   * @param {Array|null} layerData — 图层数据（可选）
   */
  function generateSteps(gridData, gridW, gridH, layerData = null) {
    try {
      switch (stepMode.value) {
        case 'region':
          steps.value = generateRegionSteps(gridData, gridW, gridH, regionCols.value, regionRows.value)
          break
        case 'layer':
          steps.value = generateLayerSteps(gridData, layerData, autoLayerCount.value)
          break
        case 'color':
        default: {
          const result = generateColorSteps(gridData, colorSort.value)
          steps.value = result
          break
        }
      }
      // 重置到第一步
      if (currentIdx.value >= steps.value.length) {
        currentIdx.value = Math.max(0, steps.value.length - 1)
      }
    } catch (e) {
      console.error('生成步骤数据失败:', e)
      // 降级为颜色分步
      steps.value = generateColorSteps(gridData, 'desc')
    }
  }

  /**
   * 切换分步模式
   */
  function switchMode(mode) {
    stepMode.value = mode
    currentIdx.value = 0
    // finishedSet 保留（按颜色完成的信息在切换模式后仍有用）
  }

  /**
   * 步骤导航
   */
  function prevStep() {
    if (hasPrev.value) {
      currentIdx.value--
      return true
    }
    return false
  }

  function nextStep() {
    if (hasNext.value) {
      currentIdx.value++
      return true
    }
    return false
  }

  function jumpToStep(idx) {
    if (idx >= 0 && idx < totalSteps.value) {
      currentIdx.value = idx
      return true
    }
    return false
  }

  /**
   * 标记/取消标记步骤完成
   */
  function toggleDone(idx) {
    const newSet = new Set(finishedSet.value)
    if (newSet.has(idx)) {
      newSet.delete(idx)
    } else {
      newSet.add(idx)
    }
    finishedSet.value = newSet

    // 检查是否全部完成
    const allDone = newSet.size >= totalSteps.value && totalSteps.value > 0

    // 自动跳到下一步
    if (!allDone && idx === currentIdx.value && autoNext.value && currentIdx.value < totalSteps.value - 1) {
      // 不自动跳转，由调用者决定
    }

    return { allDone }
  }

  function isStepDone(idx) {
    return finishedSet.value.has(idx)
  }

  function resetProgress() {
    currentIdx.value = 0
    finishedSet.value = new Set()
  }

  /**
   * 设置进度（用于恢复）
   */
  function setProgress(idx, doneIndices) {
    currentIdx.value = Math.max(0, Math.min(idx, totalSteps.value - 1 || 0))
    finishedSet.value = new Set(doneIndices || [])
  }

  /**
   * 自动播放控制
   */
  function startAutoPlay(speed = null) {
    if (speed) autoPlaySpeed.value = speed
    autoPlay.value = true
    autoPlayTimer = setInterval(() => {
      if (currentIdx.value < totalSteps.value - 1) {
        currentIdx.value++
      } else {
        stopAutoPlay()
      }
    }, autoPlaySpeed.value)
  }

  function stopAutoPlay() {
    autoPlay.value = false
    if (autoPlayTimer) {
      clearInterval(autoPlayTimer)
      autoPlayTimer = null
    }
  }

  function toggleAutoPlay() {
    if (autoPlay.value) {
      stopAutoPlay()
    } else {
      startAutoPlay()
    }
  }

  /**
   * 设置自动播放速度
   */
  function setAutoPlaySpeed(speed) {
    autoPlaySpeed.value = speed
    if (autoPlay.value) {
      stopAutoPlay()
      startAutoPlay(speed)
    }
  }

  /**
   * 获取所有颜色列表（用于色板面板）
   */
  function getAllColors(gridData) {
    const colorMap = new Map()
    for (const row of gridData || []) {
      if (!row) continue
      for (const cell of row) {
        if (!cell || !cell.hex) continue
        const key = cell.hex.toUpperCase()
        if (!colorMap.has(key)) {
          colorMap.set(key, { hex: cell.hex, name: cell.name || cell.hex, count: 0 })
        }
        colorMap.get(key).count++
      }
    }
    return Array.from(colorMap.values()).sort((a, b) => b.count - a.count)
  }

  return {
    // 状态
    stepMode,
    colorSort,
    regionCols,
    regionRows,
    autoLayerCount,
    steps,
    currentIdx,
    finishedSet,
    autoPlay,
    autoPlaySpeed,
    autoNext,

    // 计算属性
    totalSteps,
    currentStep,
    hasPrev,
    hasNext,
    isAllDone,
    finishedCount,
    progress,

    // 方法
    generateSteps,
    switchMode,
    prevStep,
    nextStep,
    jumpToStep,
    toggleDone,
    isStepDone,
    resetProgress,
    setProgress,
    startAutoPlay,
    stopAutoPlay,
    toggleAutoPlay,
    setAutoPlaySpeed,
    getAllColors,
  }
}
