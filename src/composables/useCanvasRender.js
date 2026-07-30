// ============================================================
//  useCanvasRender.js — 拼豆制作模式画布渲染调度
//  管理 CanvasRenderer 实例，提供统一的渲染接口
// ============================================================
import { ref, reactive, computed, shallowRef } from 'vue'
import { CanvasRenderer } from '@/utils/canvas.js'

// 模块级共享状态
const zoom = ref(10)
const panX = ref(0)
const panY = ref(0)
const rotation = ref(0) // 0/90/180/270
const mirrorH = ref(false)
const mirrorV = ref(false)
const showGrid = ref(true)
const showLabels = ref(false)
const showCrosshair = ref(false)
const crosshairMode = ref('follow') // 'follow' | 'always' | 'off'
const crosshairCol = ref(null)
const crosshairRow = ref(null)
const highlightIntensity = ref(0.3)
const finishedOpacity = ref(0.4)
const unfinishedOpacity = ref(0.2)

// 性能模式
const performanceMode = ref(false)
const BEAD_COUNT_THRESHOLD = 50000

export function useCanvasRender() {
  // 渲染器实例（shallowRef 避免深度响应）
  const renderer = shallowRef(null)
  const globalGridRenderer = shallowRef(null)
  const isReady = ref(false)
  const isRendering = ref(false)

  // 脏标记系统
  const dirty = reactive({
    base: true,
    finished: true,
    highlight: true,
    highlightGlow: true,
    auxiliary: true,
  })

  /**
   * 初始化渲染器
   */
  function init(mainCanvas, globalGridCanvas, gridW, gridH) {
    if (!mainCanvas) return

    renderer.value = new CanvasRenderer(mainCanvas, {
      gridW,
      gridH,
      zoom: zoom.value,
    })

    if (globalGridCanvas) {
      renderer.value.setGlobalGridCanvas(globalGridCanvas)
    }

    isReady.value = true
    markDirty('all')
  }

  /**
   * 标记脏区域
   * @param {'all'|'base'|'finished'|'highlight'|'auxiliary'} layer
   */
  function markDirty(layer) {
    if (layer === 'all') {
      Object.keys(dirty).forEach((k) => (dirty[k] = true))
    } else if (dirty.hasOwnProperty(layer)) {
      dirty[layer] = true
    }
  }

  /**
   * 调整渲染器尺寸和位置
   */
  function layout(containerEl, gridW, gridH) {
    if (!renderer.value || !containerEl) return
    renderer.value.resize(gridW, gridH, zoom.value)
    renderer.value.position(containerEl, zoom.value, panX.value, panY.value)
  }

  /**
   * 渲染所有图层
   * @param {Object} params
   * @param {Array} params.gridData — 图纸数据
   * @param {Object|null} params.currentStep — 当前步骤 {hex?, cells?}
   * @param {Set<string>} params.finishedCells — 已完成的格子 "r,c"
   * @param {HTMLElement} params.containerEl — 容器元素
   */
  function renderAll({ gridData, currentStep, finishedCells, containerEl, exclusiveHex = null }) {
    if (!renderer.value || !isReady.value) return
    isRendering.value = true

    const r = renderer.value
    const cw = containerEl?.clientWidth || 400
    const ch = containerEl?.clientHeight || 600

    // 检查是否需要性能模式
    const totalCells = (r.gridW || 58) * (r.gridH || 58)
    const isPerfMode = totalCells > BEAD_COUNT_THRESHOLD

    try {
      // 更新尺寸和位置
      r.resize(r.gridW, r.gridH, zoom.value)
      r.position(containerEl, zoom.value, panX.value, panY.value)

      // Layer 0: 全局坐标网格
      if (r.globalCanvas && dirty.auxiliary) {
        r.renderGlobalGrid(containerEl, zoom.value, panX.value, panY.value)
      }

      // Layer 1: 底图（含高亮/变暗/独占逻辑）
      const highlightHex = currentStep?.hex || null
      r.renderAll(gridData, {
        highlightHex,
        exclusiveHex,
        showGrid: showGrid.value,
        zoom: zoom.value,
        showLabels: showLabels.value && zoom.value >= 12,
      })
      dirty.base = false

      // 已完成覆盖层
      if (finishedCells && finishedCells.size > 0 && dirty.finished && !isPerfMode) {
        r.renderOverlay(finishedCells, finishedOpacity.value)
        dirty.finished = false
      }

      // 高光发光效果
      if (currentStep?.cells && currentStep.cells.length > 0 && dirty.highlightGlow && !isPerfMode) {
        r.renderGlowEffect(currentStep.cells, '#fbbf24', highlightIntensity.value)
        dirty.highlightGlow = false
      }

      // 十字线
      if (showCrosshair.value && crosshairMode.value !== 'off') {
        r.renderCrosshair(
          crosshairCol.value,
          crosshairRow.value,
          cw,
          ch,
          zoom.value,
          panX.value,
          panY.value
        )
      }
      dirty.auxiliary = false
    } catch (e) {
      console.error('Canvas renderAll error:', e)
    } finally {
      isRendering.value = false
    }
  }

  /**
   * 缩放操作
   */
  function zoomIn(factor = 1.25) {
    zoom.value = Math.min(160, zoom.value * factor)
    markDirty('all')
    return zoom.value
  }

  function zoomOut(factor = 1.25) {
    zoom.value = Math.max(0.5, zoom.value / factor)
    markDirty('all')
    return zoom.value
  }

  function zoomTo(newZoom) {
    zoom.value = Math.max(0.5, Math.min(160, newZoom))
    markDirty('all')
    return zoom.value
  }

  function zoomFit(containerEl, gridW, gridH) {
    if (!containerEl) return zoom.value
    zoom.value = Math.min(160, Math.max(0.5,
      Math.floor(
        Math.min(
          containerEl.clientWidth / gridW,
          containerEl.clientHeight / gridH
        ) * 0.85
      )
    ))
    panX.value = 0
    panY.value = 0
    markDirty('all')
    return zoom.value
  }

  function zoomActual(gridW, gridH, pixelPerBead = 10) {
    zoom.value = pixelPerBead
    markDirty('all')
    return zoom.value
  }

  /**
   * 平移操作
   */
  function panTo(x, y) {
    panX.value = x
    panY.value = y
    markDirty('auxiliary')
  }

  function panBy(dx, dy) {
    panX.value += dx
    panY.value += dy
    markDirty('auxiliary')
  }

  /**
   * 旋转视图
   */
  function rotateTo(angle) {
    rotation.value = ((angle % 360) + 360) % 360
    markDirty('base')
  }

  function rotateBy(delta) {
    rotation.value = ((rotation.value + delta) % 360 + 360) % 360
    markDirty('base')
  }

  /**
   * 镜像切换
   */
  function toggleMirrorH() {
    mirrorH.value = !mirrorH.value
    markDirty('base')
  }

  function toggleMirrorV() {
    mirrorV.value = !mirrorV.value
    markDirty('base')
  }

  /**
   * 更新十字线位置（基于触摸/鼠标坐标）
   */
  function updateCrosshair(col, row) {
    crosshairCol.value = col
    crosshairRow.value = row
    if (crosshairMode.value === 'follow') {
      showCrosshair.value = col !== null && row !== null
    }
  }

  /**
   * 设置十字线模式
   */
  function setCrosshairMode(mode) {
    crosshairMode.value = mode
    showCrosshair.value = mode === 'always' || (mode === 'follow' && crosshairCol.value !== null)
    markDirty('auxiliary')
  }

  /**
   * 判断指定格子是否在视口内（用于视口裁剪优化）
   */
  function isCellInViewport(col, row, containerEl) {
    if (!containerEl) return true
    const z = zoom.value
    const cw = containerEl.clientWidth
    const ch = containerEl.clientHeight
    const ox = cw / 2 + panX.value - (renderer.value?.gridW || 58) * z / 2
    const oy = ch / 2 + panY.value - (renderer.value?.gridH || 58) * z / 2
    const sx = ox + col * z
    const sy = oy + row * z
    return sx + z >= 0 && sx <= cw && sy + z >= 0 && sy <= ch
  }

  return {
    // 状态
    zoom,
    panX,
    panY,
    rotation,
    mirrorH,
    mirrorV,
    showGrid,
    showLabels,
    showCrosshair,
    crosshairMode,
    crosshairCol,
    crosshairRow,
    highlightIntensity,
    finishedOpacity,
    unfinishedOpacity,
    performanceMode,
    isReady,
    isRendering,

    // 方法
    init,
    layout,
    renderAll,
    markDirty,
    zoomIn,
    zoomOut,
    zoomTo,
    zoomFit,
    zoomActual,
    panTo,
    panBy,
    rotateTo,
    rotateBy,
    toggleMirrorH,
    toggleMirrorV,
    updateCrosshair,
    setCrosshairMode,
    isCellInViewport,
  }
}
