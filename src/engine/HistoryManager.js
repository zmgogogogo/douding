/**
 * 历史管理器 — 命令模式 + 快照混合撤销重做
 *
 * 核心设计：
 * - 普通绘制操作：命令模式，记录变更像素 + 新旧颜色，反向执行撤销
 * - 大范围操作（填充、变换、滤镜）：增量快照，只保存变更区域
 * - 连续同类型操作自动合并（如连续画笔一笔 = 一个 DrawCommand）
 * - 最大 200 步，可配置
 */

// ==================== 命令接口 ====================

/**
 * 命令基类
 * @interface
 */
class Command {
  /** 执行操作 */
  execute() { throw new Error('子类实现') }
  /** 反向执行 */
  undo() { throw new Error('子类实现') }
  /**
   * 尝试与下一条命令合并
   * @param {Command} next
   * @returns {boolean} 是否合并成功
   */
  mergeWith(next) { return false }
}

// ==================== 绘制命令 ====================

/**
 * 画笔/橡皮绘制命令
 * 记录变更的单元格列表 [{x, y, oldIndex, newIndex}, ...]
 */
export class DrawCommand extends Command {
  /** @type {string} 目标图层 ID */
  layerId

  /** @type {Array<{x:number, y:number, oldIndex:number, newIndex:number}>} */
  changes = []

  /**
   * @param {string} layerId
   * @param {Array<{x:number, y:number, oldIndex:number, newIndex:number}>} changes
   */
  constructor(layerId, changes = []) {
    super()
    this.layerId = layerId
    this.changes = changes
  }

  /**
   * @param {function(string, number, number, number):void} applyCell — (layerId, x, y, index)
   */
  execute(applyCell) {
    for (const c of this.changes) {
      applyCell(this.layerId, c.x, c.y, c.newIndex)
    }
  }

  undo(applyCell) {
    // 反向：恢复旧颜色
    for (let i = this.changes.length - 1; i >= 0; i--) {
      const c = this.changes[i]
      applyCell(this.layerId, c.x, c.y, c.oldIndex)
    }
  }

  /**
   * 合并连续绘制（同图层 + 时间间隔 < 500ms）
   */
  mergeWith(next) {
    if (!(next instanceof DrawCommand)) return false
    if (next.layerId !== this.layerId) return false

    // 合并相邻像素变更
    const existingKeys = new Set(this.changes.map(c => `${c.x},${c.y}`))
    for (const c of next.changes) {
      const key = `${c.x},${c.y}`
      if (existingKeys.has(key)) {
        // 同一格子在本次已经改过，保留最初的 oldIndex
        continue
      }
      this.changes.push(c)
      existingKeys.add(key)
    }
    return true
  }
}

// ==================== 填充命令 ====================

/**
 * 油漆桶填充命令
 * 记录整个连通区域的变更
 */
export class FillCommand extends Command {
  /** @type {string} */
  layerId

  /** @type {Array<{x:number, y:number, oldIndex:number}>} */
  #cells

  /** @type {number} */
  #newIndex

  constructor(layerId, cells, newIndex) {
    super()
    this.layerId = layerId
    this.#cells = cells
    this.#newIndex = newIndex
  }

  execute(applyCell) {
    for (const c of this.#cells) {
      applyCell(this.layerId, c.x, c.y, this.#newIndex)
    }
  }

  undo(applyCell) {
    for (const c of this.#cells) {
      applyCell(this.layerId, c.x, c.y, c.oldIndex)
    }
  }
}

// ==================== 图层命令 ====================

/**
 * 图层增/删/排序命令
 */
export class LayerCommand extends Command {
  /** @type {'add'|'remove'|'reorder'|'merge'} */
  #action

  /** @type {object} 操作数据（用于恢复） */
  #payload

  /** @type {function} 图层操作 API */
  #api

  constructor(action, payload, api) {
    super()
    this.#action = action
    this.#payload = payload
    this.#api = api
  }

  execute() {
    switch (this.#action) {
      case 'add': this.#api.addLayerFromSnapshot(this.#payload); break
      case 'remove': this.#api.removeLayerById(this.#payload.id); break
      case 'reorder': this.#api.reorderLayers(this.#payload.ids); break
      case 'merge': this.#api.mergeLayersDown(this.#payload.id); break
    }
  }

  undo() {
    // 反向操作
    switch (this.#action) {
      case 'add': this.#api.removeLayerById(this.#payload.id); break
      case 'remove': this.#api.addLayerFromSnapshot(this.#payload.snapshot); break
      case 'reorder': this.#api.reorderLayers(this.#payload.previousIds); break
      case 'merge': this.#api.restoreFromMerge(this.#payload); break
    }
  }
}

// ==================== 变换命令 ====================

/**
 * 画布变换命令（翻转、旋转、裁剪、resize）
 * 使用增量快照：保存变换影响区域的旧数据
 */
export class TransformCommand extends Command {
  /** @type {string} */
  layerId

  /** @type {LayerData} 变换前该图层的完整数据 */
  #before

  /** @type {LayerData} 变换后该图层的完整数据 */
  #after

  /**
   * @param {string} layerId
   * @param {LayerData} before
   * @param {LayerData} after
   */
  constructor(layerId, before, after) {
    super()
    this.layerId = layerId
    this.#before = before
    this.#after = after
  }

  execute(setLayerData) {
    setLayerData(this.layerId, this.#after)
  }

  undo(setLayerData) {
    setLayerData(this.layerId, this.#before)
  }
}

// ==================== 历史管理器 ====================

export class HistoryManager {
  /** @type {Command[]} 撤销栈 */
  #undoStack = []

  /** @type {Command[]} 重做栈 */
  #redoStack = []

  /** @type {number} 最大步数 */
  #maxSteps = 200

  /** @type {function(string, number, number, number):void} 格子写操作 */
  #applyCell = null

  /** @type {function(string, LayerData):void} 图层数据写操作 */
  #setLayerData = null

  /** @type {object} 图层操作 API */
  #layerApi = null

  /** @type {number} 上次命令执行时间（用于合并判断） */
  #lastCommandTime = 0

  /**
   * @param {{
   *   applyCell: (layerId:string, x:number, y:number, index:number) => void,
   *   setLayerData: (layerId:string, data:LayerData) => void,
   *   layerApi: object,
   *   maxSteps?: number
   * }} deps
   */
  constructor(deps) {
    this.#applyCell = deps.applyCell
    this.#setLayerData = deps.setLayerData
    this.#layerApi = deps.layerApi
    this.#maxSteps = deps.maxSteps || 200
  }

  // ==================== 执行命令 ====================

  /**
   * 执行命令并推入撤销栈
   * @param {Command} cmd
   */
  execute(cmd) {
    // 尝试与上一条命令合并（连续同类型操作）
    const now = Date.now()
    const prev = this.#undoStack.length > 0
      ? this.#undoStack[this.#undoStack.length - 1]
      : null

    if (prev && now - this.#lastCommandTime < 500 && prev.mergeWith(cmd)) {
      // 合并成功，不新增命令（DrawCommand 合并）
      this.#lastCommandTime = now
      return
    }

    // 执行命令
    if (cmd instanceof DrawCommand || cmd instanceof FillCommand) {
      cmd.execute(this.#applyCell)
    } else if (cmd instanceof TransformCommand) {
      cmd.execute(this.#setLayerData)
    } else if (cmd instanceof LayerCommand) {
      cmd.execute()
    }

    // 推入撤销栈
    this.#undoStack.push(cmd)
    this.#lastCommandTime = now

    // 清空重做栈（新操作后不能重做）
    this.#redoStack = []

    // 限制步数
    while (this.#undoStack.length > this.#maxSteps) {
      this.#undoStack.shift()
    }
  }

  // ==================== 撤销/重做 ====================

  undo() {
    const cmd = this.#undoStack.pop()
    if (!cmd) return false

    if (cmd instanceof DrawCommand || cmd instanceof FillCommand) {
      cmd.undo(this.#applyCell)
    } else if (cmd instanceof TransformCommand) {
      cmd.undo(this.#setLayerData)
    } else if (cmd instanceof LayerCommand) {
      cmd.undo()
    }

    this.#redoStack.push(cmd)
    this.#lastCommandTime = 0 // 撤销后不允许合并
    return true
  }

  redo() {
    const cmd = this.#redoStack.pop()
    if (!cmd) return false

    if (cmd instanceof DrawCommand || cmd instanceof FillCommand) {
      cmd.execute(this.#applyCell)
    } else if (cmd instanceof TransformCommand) {
      cmd.execute(this.#setLayerData)
    } else if (cmd instanceof LayerCommand) {
      cmd.execute()
    }

    this.#undoStack.push(cmd)
    this.#lastCommandTime = 0
    return true
  }

  // ==================== 状态查询 ====================

  get canUndo() { return this.#undoStack.length > 0 }
  get canRedo() { return this.#redoStack.length > 0 }
  get undoCount() { return this.#undoStack.length }
  get redoCount() { return this.#redoStack.length }

  /** 清空所有历史 */
  clear() {
    this.#undoStack = []
    this.#redoStack = []
  }

  /** 生成当前状态的摘要（用于调试） */
  getSummary() {
    return {
      undoSteps: this.#undoStack.length,
      redoSteps: this.#redoStack.length,
      lastCommands: this.#undoStack.slice(-5).map(c => c.constructor.name)
    }
  }
}
