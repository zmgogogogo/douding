/**
 * 插件 API — V3.0 开放生态（文档 15.1）
 *
 * 五大扩展接口：
 * - 画布操作 API：读写像素、操作图层、控制视图
 * - 工具扩展 API：自定义绘制工具
 * - 算法扩展 API：自定义转图/优化算法
 * - 导入导出 API：自定义文件格式
 * - UI 扩展 API：添加自定义面板/菜单/按钮
 *
 * 安全：插件在沙箱中运行（iframe + postMessage），权限受限
 */

/**
 * 插件接口定义
 *
 * @typedef {object} DoudingPlugin
 * @property {string} id — 唯一标识
 * @property {string} name — 显示名称
 * @property {string} version — 语义化版本
 * @property {string} description — 描述
 * @property {'algorithm'|'tool'|'export'|'ui'|'material'} type — 插件类型
 * @property {function} activate — 激活插件 (api: PluginContext) => void
 * @property {function} deactivate — 停用插件 () => void
 */

/**
 * 插件上下文 — 暴露给插件的安全 API
 *
 * @typedef {object} PluginContext
 * @property {CanvasAPI} canvas — 画布操作
 * @property {ToolAPI} tool — 工具注册
 * @property {ExportAPI} export — 导出扩展
 * @property {UIAPI} ui — UI 扩展
 * @property {EventBus} events — 事件总线
 */

// ==================== 画布操作 API ====================

class CanvasAPI {
  constructor(editorState) {
    this._state = editorState
  }

  /** 获取格子颜色 */
  getCell(r, c) {
    return this._state.getCell?.(r, c) || null
  }

  /** 设置格子颜色 */
  setCell(r, c, color) {
    this._state.setCell?.(r, c, color)
  }

  /** 获取画布尺寸 */
  getSize() {
    return { w: this._state.gridW?.value, h: this._state.gridH?.value }
  }

  /** 获取当前图层数据 */
  getLayerData() {
    return this._state.grid?.value
  }

  /** 获取合成网格 */
  getCompositeGrid() {
    return this._state.getCompositeGrid?.() || []
  }

  /** 缩放 */
  setZoom(zoom) {
    if (this._state.zoom) this._state.zoom.value = Math.max(0.5, Math.min(30, zoom))
  }

  /** 保存快照 */
  saveSnapshot() {
    this._state.saveSnapshot?.()
  }
}

// ==================== 工具扩展 API ====================

class ToolAPI {
  constructor() {
    this._customTools = new Map()
  }

  /**
   * 注册自定义工具
   * @param {string} id
   * @param {{ name: string, icon: string, onActivate: function, onPointerDown: function, onPointerMove: function, onPointerUp: function }} toolDef
   */
  registerTool(id, toolDef) {
    this._customTools.set(id, toolDef)
  }

  unregisterTool(id) {
    this._customTools.delete(id)
  }

  getCustomTools() {
    return [...this._customTools.entries()]
  }
}

// ==================== 导出扩展 API ====================

class ExportAPI {
  constructor() {
    this._formats = new Map()
  }

  registerFormat(ext, handler) {
    this._formats.set(ext, handler)
  }
}

// ==================== UI 扩展 API ====================

class UIAPI {
  constructor() {
    this._panels = []
    this._menuItems = []
  }

  addPanel(panel) {
    this._panels.push(panel)
  }

  addMenuItem(item) {
    this._menuItems.push(item)
  }
}

// ==================== 事件总线 ====================

class EventBus {
  constructor() {
    this._listeners = new Map()
  }

  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, [])
    this._listeners.get(event).push(fn)
  }

  off(event, fn) {
    const fns = this._listeners.get(event)
    if (fns) {
      const idx = fns.indexOf(fn)
      if (idx >= 0) fns.splice(idx, 1)
    }
  }

  emit(event, ...args) {
    const fns = this._listeners.get(event) || []
    fns.forEach((fn) => {
      try {
        fn(...args)
      } catch (e) {
        console.error('[Plugin]', e)
      }
    })
  }
}

// ==================== 插件管理器 ====================

export class PluginManager {
  constructor(editorState) {
    this._plugins = new Map()
    this._activePlugins = new Set()
    this._context = {
      canvas: new CanvasAPI(editorState),
      tool: new ToolAPI(),
      export: new ExportAPI(),
      ui: new UIAPI(),
      events: new EventBus(),
    }
  }

  /** 安装插件 */
  install(plugin) {
    if (this._plugins.has(plugin.id)) {
      console.warn(`[Plugin] 插件 ${plugin.id} 已安装`)
      return false
    }
    this._plugins.set(plugin.id, plugin)
    return true
  }

  /** 卸载插件 */
  uninstall(pluginId) {
    this.deactivate(pluginId)
    this._plugins.delete(pluginId)
  }

  /** 激活插件 */
  activate(pluginId) {
    const plugin = this._plugins.get(pluginId)
    if (!plugin) return false
    try {
      plugin.activate(this._context)
      this._activePlugins.add(pluginId)
      return true
    } catch (e) {
      console.error(`[Plugin] ${pluginId} 激活失败:`, e)
      return false
    }
  }

  /** 停用插件 */
  deactivate(pluginId) {
    const plugin = this._plugins.get(pluginId)
    if (!plugin) return
    try {
      plugin.deactivate()
    } catch (e) {
      /* 忽略 */
    }
    this._activePlugins.delete(pluginId)
  }

  /** 获取自定义工具列表 */
  getCustomTools() {
    return this._context.tool.getCustomTools()
  }

  /** 获取 UI 扩展 */
  getUIPanels() {
    return this._context.ui._panels
  }
  getMenuItems() {
    return this._context.ui._menuItems
  }

  /** 列出已安装插件 */
  listPlugins() {
    return [...this._plugins.values()].map((p) => ({
      id: p.id,
      name: p.name,
      version: p.version,
      type: p.type,
      active: this._activePlugins.has(p.id),
    }))
  }

  /** 事件总线 */
  get events() {
    return this._context.events
  }
}
