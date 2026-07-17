/**
 * 引擎桥接层 — 连接 useEditor 状态与新的 WebGL 渲染引擎
 *
 * 核心职责：
 * - 初始化 Engine（WebGL）或 Canvas2DFallback（降级）
 * - 将旧格式 JSON 二维数组(grid) 转换为 LayerData(Uint8Array)
 * - 同步 useEditor 中的图层/视口/参考图变更到渲染引擎
 * - 提供统一的渲染调度 API
 */

import { ref, shallowRef, computed, watch } from 'vue'
import { Engine, Canvas2DFallback, ColorTable, LayerData, BeanFormat } from '../engine/index.js'

/** 引擎实例（模块级单例） */
let engineInstance = null
let engineReady = false
let engineType = null // 'webgl' | 'canvas2d'

/**
 * 初始化渲染引擎
 * @param {HTMLElement} containerEl — 画布容器 DOM
 * @param {object} [opts]
 * @returns {Promise<{engine: Engine|Canvas2DFallback, isWebGL: boolean}>}
 */
export async function initEngine(containerEl, opts = {}) {
  if (engineInstance) {
    engineInstance.destroy()
  }

  // 尝试 WebGL
  const engine = new Engine()
  const isWebGL = await engine.init(containerEl, opts)

  if (isWebGL) {
    engineInstance = engine
    engineType = 'webgl'
  } else {
    // 降级 Canvas 2D
    engine.destroy()
    const fallback = new Canvas2DFallback()
    fallback.init(containerEl, opts)
    engineInstance = fallback
    engineType = 'canvas2d'
  }

  engineReady = true
  return { engine: engineInstance, isWebGL }
}

/** 获取当前引擎实例 */
export function getEngine() {
  return engineInstance
}

/** 引擎是否就绪 */
export function isEngineReady() {
  return engineReady
}

/** 当前引擎类型 */
export function getEngineType() {
  return engineType
}

// ==================== 数据转换工具 ====================

/**
 * 将旧格式 grid（JSON 二维数组）转换为新 LayerData
 * @param {Array<Array<object|null>>} oldGrid
 * @param {ColorTable} colorTable
 * @returns {LayerData}
 */
export function oldGridToLayerData(oldGrid, colorTable) {
  return BeanFormat.migrateV2Grid(oldGrid, colorTable)
}

/**
 * 将 LayerData 转换回旧格式 grid（兼容旧 API）
 * @param {LayerData} layerData
 * @param {ColorTable} colorTable
 * @returns {Array<Array<object|null>>}
 */
export function layerDataToOldGrid(layerData, colorTable) {
  const grid = []
  for (let y = 0; y < layerData.height; y++) {
    const row = []
    for (let x = 0; x < layerData.width; x++) {
      const idx = layerData.get(x, y)
      if (idx === 0) {
        row.push(null)
      } else {
        const color = colorTable.getColor(idx)
        row.push(color ? { name: color.name, hex: color.hex, brand: color.brand, series: color.series } : null)
      }
    }
    grid.push(row)
  }
  return grid
}

// ==================== 同步调度 ====================

/**
 * 全量同步：将 useEditor 的所有图层状态同步到引擎并渲染
 * @param {object} editorState — useEditor 导出的状态
 * @param {ColorTable} colorTable
 */
export function syncAllLayers(editorState, colorTable) {
  const engine = engineInstance
  if (!engine) return

  engine.resize(editorState.gridW.value, editorState.gridH.value)
  engine.setViewport(
    editorState.zoom.value,
    editorState.panX.value,
    editorState.panY.value
  )

  // 同步图层
  for (const layer of editorState.layers.value) {
    let layerData
    if (layer._ld) {
      // 已经是 LayerData
      layerData = layer._ld
    } else {
      // 旧格式转换
      layerData = oldGridToLayerData(layer.grid, colorTable)
      layer._ld = layerData // 缓存
    }

    engine.updateLayerData(layer.id, layerData, colorTable)
    engine.setLayerVisible(layer.id, layer.visible !== false)
    engine.setLayerOpacity(layer.id, layer.opacity ?? 1.0)
    engine.setLayerBlendMode(layer.id, layer.blendMode ?? 'normal')
  }

  engine.renderAll()
}

/**
 * 同步单个图层变更（用于绘制操作后的增量更新）
 * @param {object} layer — 单个图层对象
 * @param {ColorTable} colorTable
 * @param {{x:number, y:number, w:number, h:number}} [dirtyRect]
 */
export function syncLayer(layer, colorTable, dirtyRect) {
  const engine = engineInstance
  if (!engine || !layer._ld) return

  // 重新转换（保证数据一致）
  layer._ld = oldGridToLayerData(layer.grid, colorTable)
  engine.updateLayerData(layer.id, layer._ld, colorTable)
  engine.renderAll()
}

/**
 * 同步视口变更（缩放/平移）
 */
export function syncViewport(zoom, panX, panY) {
  const engine = engineInstance
  if (!engine) return
  engine.setViewport(zoom, panX, panY)
}

/**
 * 同步参考图
 */
export function syncRefOverlay(refPixels, refW, refH, refOpacity, refOffsetX, refOffsetY, refScale) {
  const engine = engineInstance
  if (!engine) return
  engine.setRefOverlay(refPixels, refW, refH, refOpacity, refOffsetX, refOffsetY, refScale)
}

/**
 * 同步网格显示
 */
export function syncGrid(showGrid) {
  // 网格由 GridRenderer 控制，Engine.renderAll 时自动处理
  // 这里预留接口
}

// ==================== 销毁 ====================

export function destroyEngine() {
  if (engineInstance) {
    engineInstance.destroy()
    engineInstance = null
    engineReady = false
    engineType = null
  }
}
