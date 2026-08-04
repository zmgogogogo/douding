<!-- ============================================
  MakeModeView.vue — 拼豆制作模式主页面 (v2.0)
  支持：全局浏览 / 分步制作（颜色/区域/图层）双模式
  集成：十字线 / 放大镜 / 坐标 / 色板 / 设置
  ============================================ -->
<template>
  <div class="make-mode-page" :class="[`theme-${settings.theme}`]" @keydown="onKeyDown" tabindex="0" ref="pageRef">
    <!-- 顶部状态栏 -->
    <MakeTopBar
      :title="designTitle"
      :gridWidth="gridWidth"
      :gridHeight="gridHeight"
      :totalBeads="totalBeads"
      :totalColors="totalColors"
      :progressPercent="stepControl.progress.value"
      :progressText="progressLabel"
      :showProgress="!isBrowseMode"
      :isBrowseMode="isBrowseMode"
      :currentTheme="settings.theme"
      :autoPlay="stepControl.autoPlay.value"
      :menuOpen="menuOpen"
      @back="handleBack"
      @toggleStepList="showStepPanel = !showStepPanel"
      @toggleTheme="cycleTheme"
      @openMenu="menuOpen = !menuOpen"
      @toggleBrowse="toggleBrowseMode"
      @openSettings="showSettings = true"
      @openArchives="showArchives = true"
      @resetProgress="handleResetProgress"
      @resetBrowseProgress="handleResetBrowseProgress"
      @screenshot="handleScreenshot"
      @startAutoPlay="stepControl.startAutoPlay()"
      @stopAutoPlay="stepControl.stopAutoPlay()"
      @finishMake="handleFinishMake"
    />

    <!-- 画布区 -->
    <div class="make-canvas-area" ref="canvasAreaRef">
      <!-- 加载/错误提示 -->
      <div v-if="loading" class="make-status-overlay">
        <div class="make-status-spinner" />
        <span class="make-status-text">加载图纸中...</span>
      </div>
      <div v-else-if="error" class="make-status-overlay">
        <span class="make-status-text text-red-400">{{ error }}</span>
        <button class="make-status-retry" @click="loadDesign()">重试</button>
      </div>

      <MakeCanvas
        ref="makeCanvasRef"
        :gridData="gridData"
        :gridWidth="gridWidth"
        :gridHeight="gridHeight"
        :highlightHex="isBrowseMode ? null : stepControl.currentStep.value?.hex || null"
        :highlightedHexes="browseHighlights"
        :finishedHexes="browseFinishedHexes"
        :showGrid="settings.showGrid"
        :showLabels="settings.showLabels"
        :isBrowseMode="isBrowseMode"
        @touchCoord="onTouchCoord"
        @zoomChange="onCanvasZoomChange"
        @panUpdate="onCanvasPanUpdate"
        @doubleTap="onCanvasDoubleTap"
      />

      <!-- 全局浏览模式覆盖层 -->
      <MakeBrowseMode
        v-if="isBrowseMode"
        :colors="allColors"
        :finishedHexes="browseFinishedHexes"
        :highlightedHexes="browseHighlights"
        @toggleHighlight="toggleBrowseHighlight"
        @toggleFinished="toggleBrowseFinished"
        @clearHighlight="browseHighlights.clear()"
        @exitBrowse="isBrowseMode = false"
      />

      <!-- 十字线 -->
      <MakeCrosshair
        v-if="settings.crosshairMode !== 'off' && touchCol !== null"
        :col="touchCol"
        :row="touchRow"
        :zoom="canvasRender.zoom.value"
        :panX="canvasRender.panX.value"
        :panY="canvasRender.panY.value"
        :gridW="gridWidth"
        :gridH="gridHeight"
        :mode="settings.crosshairMode"
        :color="crosshairColor"
        :containerW="canvasAreaW"
        :containerH="canvasAreaH"
      />

      <!-- 坐标显示 -->
      <MakeCoordDisplay
        v-if="settings.showCoords && touchCol !== null"
        :col="touchCol"
        :row="touchRow"
        :gridW="gridWidth"
      />

      <!-- 放大镜 -->
      <MakeMagnifier
        v-if="showMagnifier && touchCol !== null"
        :sourceCanvas="makeCanvasRef?.mainRef"
        :centerX="magnifierCX"
        :centerY="magnifierCY"
        :scale="magnifierScale"
        :size="magnifierSize"
        :showGrid="true"
        :showCrosshair="true"
        @close="showMagnifier = false"
      />

      <!-- 缩放控制工具栏 -->
      <div class="make-zoom-tools">
        <button @click="canvasZoomFit" title="适配屏幕">
          <MaximizeIcon :size="16" />
        </button>
        <button @click="canvasZoomActual" title="1:1 实际大小">
          1:1
        </button>
        <button @click="canvasZoomIn" title="放大">
          <PlusIcon :size="16" />
        </button>
        <span class="make-zoom-label">{{ Math.round(canvasRender.zoom.value * 10) }}%</span>
        <button @click="canvasZoomOut" title="缩小">
          <MinusIcon :size="16" />
        </button>
        <button @click="canvasRotate90" title="旋转 90°">
          <RotateCwIcon :size="16" />
        </button>
        <button
          @click="canvasRender.mirrorH.value = !canvasRender.mirrorH.value"
          :class="{ active: canvasRender.mirrorH.value }"
          title="水平翻转"
        >
          ↔
        </button>
        <button
          @click="canvasRender.mirrorV.value = !canvasRender.mirrorV.value"
          :class="{ active: canvasRender.mirrorV.value }"
          title="垂直翻转"
        >
          ↕
        </button>
        <button @click="gesture.toggleAntiMisTouch()" :class="{ active: gesture.antiMisTouch.value }" title="防误触锁定">
          <LockIcon v-if="gesture.antiMisTouch.value" :size="16" />
          <UnlockIcon v-else :size="16" />
        </button>
      </div>
    </div>

    <!-- 底部引导栏（分步模式） -->
    <MakeGuideBar
      v-if="!isBrowseMode"
      :steps="stepControl.steps.value"
      :currentIdx="stepControl.currentIdx.value"
      :finishedSet="stepControl.finishedSet.value"
      :stepMode="stepControl.stepMode.value"
      :showPanel="showStepPanel"
      :exclusiveMode="exclusiveMode"
      @prev="stepControl.prevStep(); saveProgress()"
      @next="stepControl.nextStep(); saveProgress()"
      @toggleDone="onToggleDone"
      @jumpTo="stepControl.jumpToStep($event); saveProgress()"
      @switchMode="onSwitchMode"
      @togglePanel="showStepPanel = !showStepPanel"
      @openColorPanel="showColorPanel = true"
      @toggleExclusive="exclusiveMode = !exclusiveMode; refreshCanvas()"
    />

    <!-- 全色色板面板 -->
    <MakeColorPanel
      :visible="showColorPanel"
      :colors="allColors"
      :currentHex="stepControl.currentStep.value?.hex || null"
      :finishedHexes="finishedHexSet"
      @close="showColorPanel = false"
      @select="onColorSelect"
    />

    <!-- 设置面板 -->
    <MakeSettingsPanel
      v-if="showSettings"
      :settings="settings"
      @update="onSettingsUpdate"
      @close="showSettings = false"
    />

    <!-- 存档管理面板 -->
    <MakeArchiveManager
      v-if="showArchives"
      :designId="designId"
      :archives="progress.archives.value"
      :activeName="progress.activeArchiveName.value"
      @create="onCreateArchive"
      @switch="onSwitchArchive"
      @delete="onDeleteArchive"
      @close="showArchives = false"
    />

    <!-- 完成弹窗 -->
    <div v-if="showFinishDialog" class="make-dialog-overlay" @click.self="showFinishDialog = false">
      <div class="make-dialog">
        <div class="make-dialog-icon">🎉</div>
        <h3>制作完成！</h3>
        <p>{{ designTitle }}</p>
        <div class="make-dialog-stats">
          <span>{{ totalBeads }} 颗豆子</span>
          <span>{{ totalColors }} 种颜色</span>
          <span>{{ progress.formatDuration(progress.elapsed.value) }}</span>
        </div>
        <!-- 豆仓扣料结果 -->
        <div v-if="deductResult" class="deduct-result">
          <div class="deduct-result-title">📦 已自动消耗库存</div>
          <div class="deduct-result-detail">
            共消耗 <strong>{{ deductResult.totalDeducted?.toLocaleString() || 0 }}</strong> 颗
            · {{ deductResult.colorCount }} 种颜色
            · 损耗率 {{ deductResult.lossRate }}%
          </div>
          <div v-if="deductResult.warnings?.length" class="deduct-warnings">
            <div class="deduct-warn-title">⚠️ {{ deductResult.warnings.length }} 种颜色库存不足：</div>
            <div v-for="w in deductResult.warnings.slice(0, 3)" :key="w.colorId" class="deduct-warn-item">
              <span class="deduct-warn-swatch" :style="{ background: w.colorHex }" />
              {{ w.colorName }} — 缺 {{ w.shortage }} 颗
            </div>
            <div v-if="deductResult.warnings.length > 3" class="text-[10px] text-slate-400 mt-1">
              还有 {{ deductResult.warnings.length - 3 }} 种颜色缺料…
            </div>
          </div>
        </div>
        <div class="make-dialog-actions">
          <button class="make-dialog-btn secondary" @click="$router.push('/detail/' + designId)">查看详情</button>
          <button class="make-dialog-btn primary" @click="$router.push('/warehouse')">查看豆仓</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  MaximizeIcon, PlusIcon, MinusIcon,
  RotateCwIcon, LockIcon, UnlockIcon,
} from 'lucide-vue-next'
import API from '@/api/index.js'

// 组件
import MakeCanvas from '@/components/make/MakeCanvas.vue'
import MakeGuideBar from '@/components/make/MakeGuideBar.vue'
import MakeTopBar from '@/components/make/MakeTopBar.vue'
import MakeBrowseMode from '@/components/make/MakeBrowseMode.vue'
import MakeColorPanel from '@/components/make/MakeColorPanel.vue'
import MakeSettingsPanel from '@/components/make/MakeSettingsPanel.vue'
import MakeArchiveManager from '@/components/make/MakeArchiveManager.vue'
import MakeCrosshair from '@/components/make/MakeCrosshair.vue'
import MakeMagnifier from '@/components/make/MakeMagnifier.vue'
import MakeCoordDisplay from '@/components/make/MakeCoordDisplay.vue'

// Composables
import { useCanvasRender } from '@/composables/useCanvasRender.js'
import { useStepControl } from '@/composables/useStepControl.js'
import { useProgress } from '@/composables/useProgress.js'
import { useGesture } from '@/composables/useGesture.js'
import { getColorStats } from '@/utils/stepGenerator.js'

const route = useRoute()
const router = useRouter()

const canvasRender = useCanvasRender()
const stepControl = useStepControl()
const progress = useProgress()
const gesture = useGesture()

// ========== 图纸数据 ==========
const designId = computed(() => Number(route.params.id))
const designTitle = ref('')
const gridData = ref([])
const gridWidth = ref(58)
const gridHeight = ref(58)
const totalBeads = ref(0)
const totalColors = ref(0)
const loading = ref(true)
const error = ref('')

// ========== 模式状态 ==========
const isBrowseMode = ref(false)
const browseHighlights = ref(new Set())
const browseFinishedHexes = ref(new Set())
const exclusiveMode = ref(true) // 独占模式：只看当前颜色

// ========== 设置 ==========
const DEFAULT_SETTINGS = {
  showGrid: true,
  showLabels: false,
  highlightIntensity: 'medium',
  finishedOpacity: 0.4,
  unfinishedOpacity: 0.2,
  crosshairMode: 'follow',
  showCoords: true,
  theme: 'dark',
  stepMode: 'color',
  colorSort: 'desc',
  autoNext: false,
  volumeKeysStep: false,
  keepScreenOn: true,
  antiMisTouch: false,
  autoPlaySpeed: 3,
  regionCols: 3,
  regionRows: 3,
}
const settings = ref({ ...DEFAULT_SETTINGS })

// ========== 视图 ==========
const canvasAreaRef = ref(null)
const canvasAreaW = ref(0)
const canvasAreaH = ref(0)
const makeCanvasRef = ref(null)
const pageRef = ref(null)
const menuOpen = ref(false)
const deductResult = ref(null)   // 豆仓扣料结果
const showStepPanel = ref(false)
const showColorPanel = ref(false)
const showSettings = ref(false)
const showArchives = ref(false)
const showFinishDialog = ref(false)
const showMagnifier = ref(false)

// ========== 触摸/鼠标坐标 ==========
const touchCol = ref(null)
const touchRow = ref(null)
const magnifierCX = ref(0)
const magnifierCY = ref(0)
const magnifierScale = ref(3)
const magnifierSize = ref(150)

const crosshairColor = computed(() => '#ef4444')

// ========== 计算属性 ==========
const allColors = computed(() => getColorStats(gridData.value))
const finishedHexSet = computed(() => {
  if (isBrowseMode.value) return browseFinishedHexes.value
  // 从步骤完成的Set转为hex的Set
  const hexes = new Set()
  for (const idx of stepControl.finishedSet.value) {
    const step = stepControl.steps.value[idx]
    if (step?.hex) hexes.add(step.hex.toUpperCase())
  }
  return hexes
})

const progressLabel = computed(() => {
  if (stepControl.totalSteps.value === 0) return ''
  return `第 ${stepControl.currentIdx.value + 1}/${stepControl.totalSteps.value} 步`
})

// ========== 数据加载 ==========
async function loadDesign() {
  try {
    const res = await API.get('/api/designs/' + designId.value, false)
    if (!res.data) {
      error.value = '图纸不存在 (ID: ' + designId.value + ')'
      return
    }
    const d = res.data
    designTitle.value = d.title || '未命名'
    gridWidth.value = d.gridWidth || 58
    gridHeight.value = d.gridHeight || 58
    gridData.value = d.gridData || []
    totalBeads.value = d.beadCount || 0
    totalColors.value = d.colorCount || 0
    stepControl.generateSteps(d.gridData || [], gridWidth.value, gridHeight.value)

    const saved = await progress.loadProgress(designId.value)
    if (saved) {
      stepControl.setProgress(saved.currentIdx, saved.finishedSteps)
      progress.elapsed.value = saved.elapsed || 0
    }

    loadSettings()

    await nextTick()
    initCanvas()
  } catch (e) {
    error.value = '加载图纸失败: ' + (e?.message || String(e))
    console.error('[MakeMode] 加载错误:', e)
  } finally {
    loading.value = false
  }
}

function initCanvas() {
  const mainEl = makeCanvasRef.value?.mainRef
  const gridEl = makeCanvasRef.value?.globalGridRef

  if (!mainEl) return

  if (canvasAreaRef.value) {
    const cw = canvasAreaRef.value.clientWidth
    const ch = canvasAreaRef.value.clientHeight
    const fitZoom = Math.floor(Math.min(cw / gridWidth.value, ch / gridHeight.value))
    const z = Math.max(4, Math.min(30, fitZoom))
    canvasRender.zoomTo(z)
    canvasRender.panTo(0, 0)
    syncCanvasView()
  }

  canvasRender.init(mainEl, gridEl, gridWidth.value, gridHeight.value)
  const exclusive = exclusiveMode.value ? stepControl.currentStep.value?.hex || null : null
  canvasRender.renderAll({
    gridData: gridData.value,
    currentStep: stepControl.currentStep.value,
    finishedCells: getFinishedCells(),
    containerEl: canvasAreaRef.value,
    exclusiveHex: exclusive,
  })
}

function getFinishedCells() {
  if (isBrowseMode.value) {
    // 全局浏览模式：从 finished hexes 反查 cells
    const cells = new Set()
    for (let r = 0; r < gridData.value.length; r++) {
      const row = gridData.value[r]
      if (!row) continue
      for (let c = 0; c < row.length; c++) {
        const cell = row[c]
        if (cell?.hex && browseFinishedHexes.value.has(cell.hex.toUpperCase())) {
          cells.add(`${r},${c}`)
        }
      }
    }
    return cells
  }
  // 分步模式：从 finished steps 收集 cells
  const cells = new Set()
  for (const idx of stepControl.finishedSet.value) {
    const step = stepControl.steps.value[idx]
    if (step?.cells) {
      for (const { r, c } of step.cells) {
        cells.add(`${r},${c}`)
      }
    }
  }
  return cells
}

// ========== 设置 ==========
function loadSettings() {
  const saved = localStorage.getItem('make_settings')
  if (saved) {
    try {
      settings.value = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
    } catch { /* ignore */ }
  }
  applySettings()
}

function applySettings() {
  const s = settings.value
  canvasRender.showGrid.value = s.showGrid
  canvasRender.showLabels.value = s.showLabels
  canvasRender.highlightIntensity.value = s.highlightIntensity === 'low' ? 0.15 : s.highlightIntensity === 'high' ? 0.5 : 0.3
  canvasRender.finishedOpacity.value = s.finishedOpacity
  canvasRender.unfinishedOpacity.value = s.unfinishedOpacity
  canvasRender.setCrosshairMode(s.crosshairMode)
  stepControl.colorSort.value = s.colorSort
  stepControl.autoNext.value = s.autoNext
  stepControl.regionCols.value = s.regionCols
  stepControl.regionRows.value = s.regionRows
}

function onSettingsUpdate(newSettings) {
  settings.value = { ...settings.value, ...newSettings }
  localStorage.setItem('make_settings', JSON.stringify(settings.value))
  applySettings()
  // 如果分步模式改变，重新生成步骤
  if (newSettings.stepMode && newSettings.stepMode !== stepControl.stepMode.value) {
    stepControl.switchMode(newSettings.stepMode)
    stepControl.generateSteps(gridData.value, gridWidth.value, gridHeight.value)
    canvasRender.markDirty('all')
    refreshCanvas()
  }
}

function cycleTheme() {
  const themes = ['dark', 'light', 'eyeCare']
  const idx = themes.indexOf(settings.value.theme)
  settings.value.theme = themes[(idx + 1) % themes.length]
  localStorage.setItem('make_settings', JSON.stringify(settings.value))
  document.documentElement.setAttribute('data-theme', settings.value.theme)
}

// ========== 模式切换 ==========
function toggleBrowseMode() {
  isBrowseMode.value = !isBrowseMode.value
  menuOpen.value = false
  canvasRender.markDirty('all')
  refreshCanvas()
}

// ========== 步骤操作 ==========
function onToggleDone(idx) {
  const { allDone } = stepControl.toggleDone(idx)
  saveProgress()
  canvasRender.markDirty('finished')
  refreshCanvas()
  if (allDone) {
    setTimeout(() => { showFinishDialog.value = true }, 500)
  }
}

function onSwitchMode(mode) {
  stepControl.switchMode(mode)
  stepControl.generateSteps(gridData.value, gridWidth.value, gridHeight.value)
  canvasRender.markDirty('all')
  refreshCanvas()
}

function saveProgress() {
  progress.saveProgress(
    designId.value,
    stepControl.currentIdx.value,
    stepControl.finishedSet.value,
    stepControl.stepMode.value
  )
}

// ========== 浏览模式操作 ==========
function toggleBrowseHighlight(hex) {
  const upper = hex.toUpperCase()
  const newSet = new Set(browseHighlights.value)
  if (newSet.has(upper)) {
    newSet.delete(upper)
  } else {
    newSet.add(upper)
  }
  browseHighlights.value = newSet
}

function toggleBrowseFinished(hex) {
  const upper = hex.toUpperCase()
  const newSet = new Set(browseFinishedHexes.value)
  if (newSet.has(upper)) {
    newSet.delete(upper)
  } else {
    newSet.add(upper)
  }
  browseFinishedHexes.value = newSet
  // 保存浏览进度
  localStorage.setItem(
    `make_browse_${designId.value}`,
    JSON.stringify(Array.from(newSet))
  )
}

function loadBrowseProgress() {
  const raw = localStorage.getItem(`make_browse_${designId.value}`)
  if (raw) {
    try {
      browseFinishedHexes.value = new Set(JSON.parse(raw))
    } catch { /* ignore */ }
  }
}

// ========== 颜色面板 ==========
function onColorSelect(color) {
  if (isBrowseMode.value) {
    toggleBrowseHighlight(color.hex)
  } else {
    // 在分步模式中跳转到对应步骤
    const idx = stepControl.steps.value.findIndex(
      (s) => s.hex?.toUpperCase() === color.hex?.toUpperCase()
    )
    if (idx >= 0) {
      stepControl.jumpToStep(idx)
      saveProgress()
      canvasRender.markDirty('highlight')
      refreshCanvas()
    }
  }
  showColorPanel.value = false
}

// ========== 缩放控制（同步 composable 和 MakeCanvas） ==========
function syncCanvasView() {
  if (makeCanvasRef.value?.updateViewState) {
    makeCanvasRef.value.updateViewState(canvasRender.zoom.value, canvasRender.panX.value, canvasRender.panY.value)
  }
}
function canvasZoomIn() {
  canvasRender.zoomIn()
  syncCanvasView()
  refreshCanvas()
}
function canvasZoomOut() {
  canvasRender.zoomOut()
  syncCanvasView()
  refreshCanvas()
}
function canvasZoomFit() {
  canvasRender.zoomFit(canvasAreaRef.value, gridWidth.value, gridHeight.value)
  syncCanvasView()
  refreshCanvas()
}
function canvasZoomActual() {
  canvasRender.zoomActual()
  syncCanvasView()
  refreshCanvas()
}
function canvasRotate90() {
  canvasRender.rotateBy(90)
  syncCanvasView()
  refreshCanvas()
}

// ========== 刷新画布 ==========
function refreshCanvas() {
  if (!canvasRender.isReady.value || !canvasAreaRef.value) return
  const exclusive = exclusiveMode.value ? stepControl.currentStep.value?.hex || null : null
  canvasRender.renderAll({
    gridData: gridData.value,
    currentStep: stepControl.currentStep.value,
    finishedCells: getFinishedCells(),
    containerEl: canvasAreaRef.value,
    exclusiveHex: exclusive,
  })
}

// ========== 触摸事件 ==========
function onTouchCoord({ col, row, x, y }) {
  touchCol.value = col
  touchRow.value = row
  magnifierCX.value = x
  magnifierCY.value = y
}

function onCanvasZoomChange(newZoom) {
  canvasRender.zoom.value = newZoom
  if (makeCanvasRef.value?.updateViewState) {
    makeCanvasRef.value.updateViewState(newZoom, undefined, undefined)
  }
  refreshCanvas()
}

function onCanvasPanUpdate({ panX: px, panY: py }) {
  canvasRender.panX.value = px
  canvasRender.panY.value = py
  if (makeCanvasRef.value?.updateViewState) {
    makeCanvasRef.value.updateViewState(undefined, px, py)
  }
  // 平移时只更新辅助层（网格和十字线）
  canvasRender.markDirty('auxiliary')
  refreshCanvas()
}

function onCanvasDoubleTap() {
  const z = canvasRender.zoom.value
  if (z <= 10) {
    canvasRender.zoomTo(20)
  } else {
    canvasRender.zoomFit(canvasAreaRef.value, gridWidth.value, gridHeight.value)
  }
  // 同步 MakeCanvas 的 zoom
  if (makeCanvasRef.value?.updateViewState) {
    makeCanvasRef.value.updateViewState(canvasRender.zoom.value, canvasRender.panX.value, canvasRender.panY.value)
  }
  refreshCanvas()
}

// ========== 键盘快捷键 ==========
function onKeyDown(e) {
  gesture.handleKeyDown(e, {
    onPrevStep: () => { stepControl.prevStep(); saveProgress() },
    onNextStep: () => { stepControl.nextStep(); saveProgress() },
    onTogglePlay: () => stepControl.toggleAutoPlay(),
    onRotateView: () => canvasRender.rotateBy(90),
    onFitScreen: () => canvasRender.zoomFit(canvasAreaRef.value, gridWidth.value, gridHeight.value),
    onToggleGrid: () => { settings.value.showGrid = !settings.value.showGrid; applySettings() },
    onToggleLabels: () => { settings.value.showLabels = !settings.value.showLabels; applySettings() },
  })
}

// ========== 其他操作 ==========
function handleBack() {
  saveProgress()
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/detail/' + designId.value)
  }
}

function handleResetProgress() {
  stepControl.resetProgress()
  progress.clearProgress(designId.value)
  menuOpen.value = false
  canvasRender.markDirty('all')
  refreshCanvas()
}

function handleResetBrowseProgress() {
  browseFinishedHexes.value = new Set()
  browseHighlights.value = new Set()
  localStorage.removeItem(`make_browse_${designId.value}`)
  menuOpen.value = false
}

async function handleFinishMake() {
  menuOpen.value = false
  const result = await progress.finishMake(designId.value, 0)
  if (result) {
    // 标记全部完成
    for (let i = 0; i < stepControl.totalSteps.value; i++) {
      stepControl.finishedSet.value = new Set([...stepControl.finishedSet.value, i])
    }
    // 保存扣料结果供弹窗展示
    deductResult.value = result.deduct || null
    showFinishDialog.value = true
  }
}

function handleScreenshot() {
  // 使用 Canvas API 导出当前画布为图片
  if (makeCanvasRef.value?.mainRef) {
    const dataUrl = makeCanvasRef.value.mainRef.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `${designTitle.value || '拼豆图纸'}_进度.png`
    link.href = dataUrl
    link.click()
  }
}

// ========== 存档操作 ==========
async function onCreateArchive(name) {
  await progress.createArchive(designId.value, name)
}

async function onSwitchArchive(archive) {
  const saved = await progress.switchArchive(designId.value, archive)
  if (saved) {
    stepControl.setProgress(saved.currentIdx, saved.finishedSteps)
    progress.elapsed.value = saved.elapsed || 0
    canvasRender.markDirty('all')
    refreshCanvas()
  }
}

async function onDeleteArchive(archiveId) {
  await progress.deleteArchive(designId.value, archiveId)
}

// ========== 生命周期 ==========
let resizeObserver = null
onMounted(async () => {
  // 观察画布容器尺寸变化
  if (canvasAreaRef.value) {
    canvasAreaW.value = canvasAreaRef.value.clientWidth
    canvasAreaH.value = canvasAreaRef.value.clientHeight
    resizeObserver = new ResizeObserver(() => {
      if (canvasAreaRef.value) {
        canvasAreaW.value = canvasAreaRef.value.clientWidth
        canvasAreaH.value = canvasAreaRef.value.clientHeight
      }
    })
    resizeObserver.observe(canvasAreaRef.value)
  }

  await loadDesign()
  loadBrowseProgress()
  progress.startTimer()
  pageRef.value?.focus()
  applySettings()
})

onBeforeUnmount(() => {
  progress.stopTimer()
  stepControl.stopAutoPlay()
  saveProgress()
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

// 监听模式切换，刷新画布
watch(isBrowseMode, () => {
  nextTick(refreshCanvas)
})

// 点击空白关闭菜单
watch(menuOpen, (v) => {
  if (v) {
    const close = () => { menuOpen.value = false; document.removeEventListener('click', close) }
    setTimeout(() => document.addEventListener('click', close), 0)
  }
})
</script>

<style scoped>
.make-mode-page {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  outline: none;
}

/* 主题 */
.theme-light {
  background: #f8fafc;
}
.theme-eyeCare {
  background: #fefce8;
}

.make-canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* 缩放工具栏 */
.make-zoom-tools {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}
.make-zoom-tools button {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(8px);
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.15s;
}
.make-zoom-tools button:hover {
  background: rgba(30, 41, 59, 0.9);
}
.make-zoom-tools button.active {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
.make-zoom-label {
  text-align: center;
  font-size: 10px;
  color: #94a3b8;
  padding: 2px;
}

.theme-light .make-zoom-tools button {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(0, 0, 0, 0.1);
  color: #64748b;
}

/* 完成弹窗 */
.make-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.make-dialog {
  background: #fff;
  border-radius: 24px;
  padding: 28px 24px;
  text-align: center;
  max-width: 300px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}
.make-dialog-icon { font-size: 48px; margin-bottom: 12px; }
.make-dialog h3 { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
.make-dialog p { font-size: 13px; color: #64748b; margin-bottom: 16px; }
.make-dialog-stats {
  display: flex;
  justify-content: center;
  gap: 16px;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 20px;
}
.make-dialog-actions { display: flex; gap: 8px; }
.make-dialog-btn {
  flex: 1;
  height: 40px;
  border-radius: 20px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.make-dialog-btn.primary { background: #2563eb; color: #fff; }
.make-dialog-btn.secondary { background: #f1f5f9; color: #475569; }

/* 扣料结果 */
.deduct-result {
  margin: 12px 0;
  padding: 12px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  text-align: left;
}
.deduct-result-title {
  font-size: 12px;
  font-weight: 600;
  color: #16a34a;
  margin-bottom: 4px;
}
.deduct-result-detail {
  font-size: 11px;
  color: #4b5563;
}
.deduct-warnings {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #dcfce7;
}
.deduct-warn-title {
  font-size: 11px;
  font-weight: 600;
  color: #dc2626;
  margin-bottom: 4px;
}
.deduct-warn-item {
  font-size: 10px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}
.deduct-warn-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
  flex-shrink: 0;
}

/* 加载/错误状态 */
.make-status-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 5;
}
.make-status-spinner {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid #e2e8f0;
  border-top-color: #2563eb;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.make-status-text {
  font-size: 13px;
  color: #94a3b8;
}
.make-status-retry {
  padding: 8px 20px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
</style>
