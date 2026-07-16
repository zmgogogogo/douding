<!-- ============================================
  EditorView.vue — 拼豆编辑器主页面
  入口页：智能工具卡片 + 最近编辑
  编辑器：ohmybead.cn 风格全屏编辑器
  ============================================ -->
<template>
  <!-- ====== 创作入口页 ====== -->
  <div v-if="!inEditor" class="overflow-y-auto h-full">
    <div class="p-4 md:p-8 max-w-2xl mx-auto space-y-6">

      <!-- 模块1：开始新项目 白色卡片 -->
      <div class="relative overflow-hidden rounded-[2rem] bg-white
                  p-6 md:p-8 cursor-pointer active:scale-[0.99] transition-all
                  shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-100
                  hover:shadow-[0_12px_36px_rgba(0,0,0,0.1)]"
        @click="startBlank">
        <div class="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-50/50" />
        <div class="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-blue-50/30" />
        <div class="relative z-10 flex items-start justify-between">
          <div class="flex items-start gap-4">
            <div class="w-11 h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
              <PlusIcon :size="22" class="text-white" />
            </div>
            <div>
              <h2 class="text-xl md:text-2xl font-extrabold text-slate-800 mb-1">开始新项目</h2>
              <p class="text-sm text-slate-400">从空白画布开始您的像素艺术之旅</p>
            </div>
          </div>
          <div class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-xs text-blue-600 font-medium flex-shrink-0">
            <span class="w-1.5 h-1.5 rounded-full bg-green-400" />创作模式
          </div>
        </div>
        <div class="relative z-10 flex justify-end mt-4">
          <div class="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
            <ArrowRightIcon :size="18" class="text-primary" />
          </div>
        </div>
      </div>

      <!-- 模块2：智能工具标题栏 -->
      <div class="flex items-center justify-between">
        <h3 class="text-[15px] font-bold text-slate-400">智能工具</h3>
        <a class="flex items-center gap-1 text-[13px] text-blue-500 font-medium cursor-pointer hover:text-blue-600"
          @click="toast.show('使用教程即将上线')"><BookIcon :size="14" />使用教程</a>
      </div>

      <!-- 模块3：智能工具卡片 -->
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div class="tool-card" @click="$router.push('/image-import')">
            <div class="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
              <CameraIcon :size="20" class="text-sky-500" /></div>
            <div class="flex-1 min-w-0"><div class="font-bold text-sm text-slate-800">照片转图纸</div>
              <div class="text-[11px] text-slate-400 mt-0.5">将图片智能转化为拼豆图案</div></div>
            <ChevronRightIcon :size="16" class="text-slate-300" />
          </div>
          <div class="tool-card" @click="showAiPrompt = true">
            <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Wand2Icon :size="20" class="text-amber-500" /></div>
            <div class="flex-1 min-w-0"><div class="font-bold text-sm text-slate-800">AI 生成</div>
              <div class="text-[11px] text-slate-400 mt-0.5">输入描述文字，AI 自动生成图案</div></div>
            <span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 text-[9px] font-bold">AI</span>
            <ChevronRightIcon :size="16" class="text-slate-300" />
          </div>
        </div>
        <div class="tool-card" @click="$router.push('/ocr')">
          <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <ScanTextIcon :size="20" class="text-blue-700" /></div>
          <div class="flex-1 min-w-0"><div class="font-bold text-sm text-slate-800">OCR 识别图纸</div>
            <div class="text-[11px] text-slate-400 mt-0.5">拍照或上传图纸自动识别颜色符号</div></div>
          <ChevronRightIcon :size="16" class="text-slate-300" />
        </div>
      </div>

      <!-- 最近编辑 -->
      <section v-if="recentDesigns.length" class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-[17px] font-bold text-slate-900">最近编辑</h2>
          <router-link to="/warehouse" class="text-[13px] text-primary font-medium hover:underline">查看全部</router-link>
        </div>
        <div class="space-y-2">
          <div v-for="d in recentDesigns" :key="d.id"
            class="flex items-center gap-3 bg-white rounded-xl p-2.5 cursor-pointer border border-slate-100
                   hover:shadow-md active:scale-[0.99] transition-all"
            @click="openDesign(d.id)">
            <div class="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
              <canvas :ref="el => renderRecentThumb(el, d)" class="w-full h-full pixel-thumb" /></div>
            <div class="flex-1 min-w-0"><div class="font-medium text-sm truncate text-slate-800">{{ d.title }}</div>
              <div class="text-slate-400 text-xs mt-0.5">{{ d.gridWidth }}×{{ d.gridHeight }} · {{ d.beadCount || 0 }}颗</div></div>
            <ClockIcon :size="14" class="text-slate-300" />
          </div>
        </div>
      </section>

      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />

      <!-- 画布尺寸选择弹窗 -->
      <div v-if="showSizePicker" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        @click.self="showSizePicker = false">
        <div class="bg-white rounded-2xl shadow-xl p-5 w-[340px] max-w-[90vw] space-y-4 animate-bounce-in">
          <h3 class="font-bold text-slate-800 text-sm">选择画布尺寸</h3>
          <div class="grid grid-cols-2 gap-2">
            <button v-for="p in sizePresets" :key="p.label"
              class="p-3 rounded-xl border border-slate-200 hover:border-primary hover:bg-blue-50 transition-colors text-left"
              @click="confirmSize(p.w, p.h)">
              <div class="font-semibold text-sm text-slate-700">{{ p.label }}</div>
              <div class="text-[10px] text-slate-400">{{ p.w }}×{{ p.h }} · {{ p.desc }}</div>
            </button>
          </div>
          <div class="flex items-center gap-2 pt-1">
            <input v-model.number="sizeDialogW" type="number" min="10" max="300"
              class="flex-1 h-9 border border-slate-200 rounded-lg px-3 text-xs text-center" placeholder="宽" />
            <span class="text-slate-300">×</span>
            <input v-model.number="sizeDialogH" type="number" min="10" max="300"
              class="flex-1 h-9 border border-slate-200 rounded-lg px-3 text-xs text-center" placeholder="高" />
            <button class="h-9 px-3 rounded-lg bg-primary text-white text-xs font-medium"
              @click="confirmSize(sizeDialogW, sizeDialogH)">确定</button>
          </div>
        </div>
      </div>

      <!-- AI 生成弹窗 -->
      <div v-if="showAiPrompt" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        @click.self="showAiPrompt = false">
        <div class="bg-white rounded-2xl shadow-xl p-6 w-[380px] max-w-[90vw] space-y-4">
          <div class="flex items-center gap-2">
            <Wand2Icon :size="20" class="text-amber-500" />
            <h3 class="font-bold text-slate-800">AI 生成拼豆图案</h3>
          </div>
          <p class="text-xs text-slate-500">输入图案描述，AI 将自动生成拼豆图纸。支持的关键词：猫、狗、兔子、草莓、爱心、星星、蘑菇等。</p>
          <div class="flex flex-wrap gap-1">
            <button v-for="kw in ['猫','狗','草莓','爱心','星星','蘑菇','笑脸','太阳']" :key="kw"
              class="px-2 py-1 rounded-md text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              @click="aiPrompt = kw">{{ kw }}</button>
          </div>
          <input v-model="aiPrompt" type="text" placeholder="例如：可爱的小猫咪"
            class="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary transition-colors"
            @keydown.enter="generateAi" />
          <div class="flex gap-2">
            <select v-model="aiBrand" class="flex-1 h-9 border border-slate-200 rounded-lg text-xs px-2 bg-slate-50">
              <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
            </select>
            <input v-model.number="aiSize" type="number" min="8" max="64" class="w-16 h-9 border border-slate-200 rounded-lg text-xs text-center" />
          </div>
          <button class="w-full h-10 rounded-xl bg-amber-500 text-white font-semibold text-sm
                         hover:bg-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            :disabled="!aiPrompt.trim() || aiGenerating" @click="generateAi">
            <LoaderIcon v-if="aiGenerating" :size="14" class="animate-spin" />
            <Wand2Icon v-else :size="14" />
            {{ aiGenerating ? '生成中...' : '开始生成' }}
          </button>
          <button class="w-full text-xs text-slate-400 hover:text-slate-600" @click="showAiPrompt = false">取消</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ====== 编辑器视图 ====== -->
  <div v-else class="fixed inset-0 z-50 flex flex-col bg-[var(--ui-bg-base)]">
    <!-- ===== 顶部导航栏 ===== -->
    <EditorTopBar
      :title="editTitle"
      :hasUnsaved="hasUnsavedChanges"
      :canUndo="historyIdx > 0"
      :canRedo="historyIdx < historyArr.length - 1"
      :showGrid="showGrid"
      :refOpacity="refOpacity"
      @back="exitEditor"
      @update:title="editTitle = $event"
      @undo="undo" @redo="redo"
      @toggleGrid="showGrid = !showGrid"
      @toggleRef="cycleRefOpacity"
      @exportPNG="exportPNG" @exportPDF="exportPDFFile" @exportJSON="exportJSONFile"
      @save="saveDesign" @showInfo="showInfo = !showInfo"
      @openSizeDialog="openSizeDialog" @clear="confirmClear"
    />

    <!-- ===== 主体：工具栏 + 画布 + 面板 ===== -->
    <div class="flex-1 flex overflow-hidden min-h-0">
      <!-- 左侧工具栏 -->
      <EditorToolbar
        :currentTool="tool"
        :showGrid="showGrid"
        :refOpacity="refOpacity"
        :refLocked="refLocked"
        :symmetryMode="symmetryMode"
        :guideMode="guideMode"
        :hasSelection="!!selectionRect"
        @selectTool="onSelectTool"
        @toggleGrid="showGrid = !showGrid"
        @cycleRefOpacity="cycleRefOpacity"
        @toggleRefLock="toggleRefLock"
        @cycleSymmetry="cycleSymmetry"
        @copySelection="copySelection" @pasteSelection="pasteSelection"
        @deleteSelection="deleteSelection"
        @flipSelectionH="flipSelectionH" @flipSelectionV="flipSelectionV"
        @importImage="triggerImport"
        @exportPNG="exportPNG" @exportPDF="exportPDFFile"
        @toggleGuide="toggleGuideMode"
      />

      <!-- 中间画布区 -->
      <!-- 图层面板 -->
      <EditorLayerPanel
        :layers="layers" :currentLayerId="currentLayerId"
        @addLayer="addLayer('新图层')"
        @removeLayer="removeLayer"
        @selectLayer="selectLayer"
        @toggleVisibility="toggleLayerVisibility"
        @mergeDown="mergeLayerDown" />

      <EditorCanvas ref="editorCanvasRef"
        :gridW="gridW" :gridH="gridH" :grid="compositeGrid"
        :zoom="zoom" :panX="panX" :panY="panY"
        :tool="tool" :brushSize="brushSize" :curColor="curColor"
        :highlightHex="highlightHex" :symmetryMode="symmetryMode"
        :showGrid="showGrid" :editMode="editMode" :guideMode="guideMode"
        :refOpacity="refOpacity" :refPixels="refPixels" :refW="refW" :refH="refH"
        :refOffsetX="refOffsetX" :refOffsetY="refOffsetY" :refScale="refScale"
        :guideCurrentColor="guideCurrentColor" :guideProgress="guideProgress"
        :guideColorIdx="guideColorIdx"
        :selectionRect="selectionRect"
        :beadCount="beadCount"
        :replaceSourceHex="replaceSourceHex"
        :focusDimHex="focusMode && focusColor ? focusColor.hex : null"
        @setCell="setCell" @saveSnapshot="saveSnapshot" @scheduleRender="scheduleRender"
        @update:panX="panX = $event" @update:panY="panY = $event"
        @setZoom="setZoom" @zoomIn="zoomIn" @zoomOut="zoomOut"
        @zoomToFit="zoomToFit" @zoomTo1x="zoomTo1x"
        @setRefOpacity="setRefOpacity"
        @refZoomIn="refScale = Math.min(3, (refScale||1) * 1.25)"
        @refZoomOut="refScale = Math.max(0.25, (refScale||1) * 0.8)"
        @refMove="(dx, dy) => { refOffsetX += dx; refOffsetY += dy }"
        @refReset="refScale = 1; refOffsetX = 0; refOffsetY = 0"
        @toggleGuide="toggleGuideMode" @guidePrev="guidePrev" @guideNext="guideNext"
        @openSizeDialog="openSizeDialog" @removeNoise="removeNoise"
        @pickColor="onPickColor" @floodFill="onFloodFill"
      />

      <!-- 右侧调色板面板 -->
      <EditorRightPanel
        :brand="brand"
        :seriesActive="seriesActive"
        :brands="brands"
        :seriesList="series"
        :colors="filteredColors"
        :curColor="curColor"
        :brushSize="brushSize"
        :stats="gridColorStats"
        :inventory="inventory"
        :totalColorCount="totalColorCount"
        :seriesColorCount="seriesColorCount"
        :brandColorCounts="brandColorCounts"
        :searchText="colorSearch"
        :recentColors="recentColors"
        @update:brand="onBrandChange"
        @update:seriesActive="seriesActive = $event"
        @update:brushSize="brushSize = $event"
        @update:searchText="colorSearch = $event"
        @selectColor="onSelectColor"
        @highlightColor="onHighlightColor"
      />
    </div>

    <!-- ===== 专注模式覆盖层 ===== -->
    <EditorFocusMode
      v-if="focusMode && focusColor"
      :focusColor="focusColor"
      :beadCount="focusBeadCount"
      @exit="focusMode = false; highlightHex = null; renderAll()"
    />

    <!-- ===== 尺寸修改弹窗 ===== -->
    <Teleport to="body">
      <div v-if="showSizeDialog" class="fixed inset-0 z-[150] flex items-center justify-center bg-black/30 backdrop-blur-sm"
        @click.self="showSizeDialog = false">
        <div class="bg-white rounded-2xl shadow-xl p-5 w-[300px] max-w-[90vw] space-y-4 animate-bounce-in">
          <h3 class="font-bold text-[var(--ui-text-primary)] text-sm">修改尺寸</h3>
          <div class="flex items-center gap-2">
            <input v-model.number="sizeDialogW" type="number" min="10" max="300"
              class="flex-1 h-10 border border-[var(--ui-border)] rounded-xl px-3 text-sm text-center outline-none
                     focus:border-[var(--ui-accent)] transition-colors" placeholder="宽" />
            <span class="text-[var(--ui-text-tertiary)] font-bold">×</span>
            <input v-model.number="sizeDialogH" type="number" min="10" max="300"
              class="flex-1 h-10 border border-[var(--ui-border)] rounded-xl px-3 text-sm text-center outline-none
                     focus:border-[var(--ui-accent)] transition-colors" placeholder="高" />
          </div>
          <p v-if="sizeDialogW > 200 || sizeDialogH > 200" class="text-[10px] text-amber-600">尺寸较大，可能出现卡顿，建议拆分制作</p>
          <div class="flex gap-2">
            <button class="flex-1 h-9 rounded-xl bg-[var(--ui-bg-tertiary)] text-[var(--ui-text-secondary)] text-xs font-medium
                         hover:bg-[var(--ui-border)] transition-colors"
              @click="showSizeDialog = false">取消</button>
            <button class="flex-1 h-9 rounded-xl bg-primary text-white text-xs font-medium
                         hover:bg-primary-dark transition-colors active:scale-[0.98]"
              @click="applyResize">确认</button>
          </div>
        </div>
      </div>

      <!-- 图纸信息弹窗 -->
      <div v-if="showInfo" class="fixed inset-0 z-[150] flex items-center justify-center bg-black/30 backdrop-blur-sm"
        @click.self="showInfo = false">
        <div class="bg-white rounded-2xl shadow-xl p-5 w-[280px] max-w-[90vw] space-y-3 animate-bounce-in">
          <h3 class="font-bold text-[var(--ui-text-primary)] text-sm">图纸信息</h3>
          <div class="space-y-1.5 text-xs text-[var(--ui-text-secondary)]">
            <div class="flex justify-between"><span>尺寸</span><span class="font-medium">{{ gridW }}×{{ gridH }}</span></div>
            <div class="flex justify-between"><span>珠子数</span><span class="font-medium">{{ beadCount }}</span></div>
            <div class="flex justify-between"><span>颜色数</span><span class="font-medium">{{ gridColorStats.length }}</span></div>
            <div v-if="editId" class="flex justify-between"><span>ID</span><span class="font-medium">#{{ editId }}</span></div>
          </div>
          <button class="w-full h-9 rounded-xl bg-[var(--ui-bg-tertiary)] text-[var(--ui-text-secondary)] text-xs font-medium"
            @click="showInfo = false">关闭</button>
        </div>
      </div>
    </Teleport>

    <!-- 隐藏的文件输入 -->
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'
import { useDialog } from '@/composables/useDialog.js'
import { useEditor } from '@/composables/useEditor.js'

import {
  PlusIcon, ArrowRightIcon, BookIcon, CameraIcon,
  ScanTextIcon, ChevronRightIcon, ClockIcon, LoaderIcon, Wand2Icon
} from 'lucide-vue-next'

import EditorTopBar from '@/components/editor/EditorTopBar.vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import EditorCanvas from '@/components/editor/EditorCanvas.vue'
import EditorRightPanel from '@/components/editor/EditorRightPanel.vue'
import EditorFocusMode from '@/components/editor/EditorFocusMode.vue'
import EditorLayerPanel from '@/components/editor/EditorLayerPanel.vue'

const compositeGrid = computed(() => getCompositeGrid())

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const toast = useToast()
const dialog = useDialog()

// 从 composable 解构状态
const {
  gridW, gridH, grid, zoom, panX, panY,
  tool, brushSize, curColor, highlightHex,
  symmetryMode, showGrid, refOpacity, refLocked,
  refPixels, refW, refH, refImage,
  editMode, guideMode, focusMode,
  selectionRect, clipboard,
  replaceSourceHex,
  guideColorIdx, guideDone, guideColors, guideCurrentColor, guideProgress,
  historyArr, historyIdx,
  beadData, inventory,
  editId, editTitle, hasUnsavedChanges, autoSaveKey,
  showInfo, showSizeDialog, sizeDialogW, sizeDialogH,
  showColorStats,
  mousePos, crossCol, crossRow,
  brand, seriesActive,
  brands, series, filteredColors,
  beadCount, gridColorStats,
  brandColorCounts, totalColorCount, seriesColorCount,
  brushPreviewStyle, colorSearch, recentColors, addRecentColor,
  layers, currentLayerId, addLayer, removeLayer, selectLayer,
  toggleLayerVisibility, setLayerOpacity, mergeLayerDown, getCompositeGrid,
  initGrid, getCell, setCell,
  saveSnapshot, undo, redo,
  cycleSymmetry, cycleRefOpacity, setRefOpacity, toggleRefLock,
  toggleGuideMode, guidePrev, guideNext,
  openSizeDialog, applyResize,
  deleteSelection, copySelection, pasteSelection,
  flipSelectionH, flipSelectionV,
  getOrderedRect,
} = useEditor()

const editorCanvasRef = ref(null)
const fileInput = ref(null)

// ---- 创作入口页状态 ----
const inEditor = ref(false)
const recentDesigns = ref([])
const showAiPrompt = ref(false)
const aiPrompt = ref('')
const aiBrand = ref('Hama')
const aiSize = ref(32)
const aiGenerating = ref(false)

// 专注模式
const focusColor = ref(null)
const focusBeadCount = computed(() => {
  if (!focusColor.value) return 0
  let n = 0
  for (const r of grid.value) {
    if (!r) continue
    for (const c of r) {
      if (c?.hex?.toUpperCase() === focusColor.value.hex.toUpperCase()) n++
    }
  }
  return n
})

// 自动保存
const autoSaveTimer = ref(null)

// 渲染调度
let rafId = null
function scheduleRender() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    editorCanvasRef.value?.renderAll()
  })
}

function renderAll() {
  editorCanvasRef.value?.renderAll()
}

// ---- 工具栏操作 ----
function onSelectTool(t) {
  tool.value = t
  if (t === 'select') selectionRect.value = null
  if (t !== 'replace') replaceSourceHex.value = null
}

function onSelectColor(c) {
  addRecentColor(c)  // 记录最近使用
  if (tool.value === 'replace') {
    if (!replaceSourceHex.value) {
      replaceSourceHex.value = c.hex
      toast.show('已选源色，请点击目标色完成替换')
    } else {
      replaceColor(replaceSourceHex.value, c)
      replaceSourceHex.value = null
    }
    return
  }
  curColor.value = c
  if (focusMode.value) { focusMode.value = false; highlightHex.value = null }
  if (highlightHex.value === c.hex) {
    // 再次点击同一颜色 → 进入专注模式
    focusColor.value = c
    focusMode.value = true
  } else {
    focusMode.value = false
  }
  highlightHex.value = highlightHex.value === c.hex ? null : c.hex
  renderAll()
}

function onHighlightColor(hex) {
  highlightHex.value = highlightHex.value === hex ? null : hex
  renderAll()
}

function onPickColor(row, col) {
  const cell = getCell(row, col)
  if (cell?.hex) {
    curColor.value = cell
    if (tool.value === 'picker') tool.value = 'brush'
    highlightHex.value = cell.hex
    renderAll()
  }
}

function onBrandChange(b) {
  brand.value = b
  seriesActive.value = ''
}

// ---- 颜色替换 ----
function replaceColor(sourceHex, targetColor) {
  let count = 0
  for (let r = 0; r < gridH.value; r++) {
    for (let c = 0; c < gridW.value; c++) {
      const cell = getCell(r, c)
      if (cell?.hex?.toUpperCase() === sourceHex.toUpperCase()) {
        setCell(r, c, targetColor)
        count++
      }
    }
  }
  saveSnapshot()
  renderAll()
  toast.show(`已替换 ${count} 个珠子`)
}

// ---- 洪水填充 ----
function onFloodFill(sr, sc) {
  const targetCell = getCell(sr, sc)
  const targetHex = targetCell?.hex || null
  const fillColor = curColor.value

  // 相同颜色不需要填充
  if (targetHex && fillColor && targetHex.toUpperCase() === fillColor.hex.toUpperCase()) return
  if (!targetHex && !fillColor) return

  const visited = new Set()
  const queue = [[sr, sc]]
  const cells = getSymmetryCellsGeneric(sr, sc)

  // 收集所有对称起点
  const queueAll = [...cells]
  for (const [r, c] of cells) {
    if (r >= 0 && r < gridH.value && c >= 0 && c < gridW.value) {
      visited.add(`${r},${c}`)
      queue.push([r, c])
    }
  }

  while (queue.length > 0) {
    const [r, c] = queue.shift()
    const cell = getCell(r, c)
    const currentHex = cell?.hex || null

    if (targetHex === null && currentHex !== null) continue
    if (targetHex !== null && currentHex?.toUpperCase() !== targetHex.toUpperCase()) continue

    // 获取对称位置
    const symCells = getSymmetryCellsGeneric(r, c)
    for (const [rr, cc] of symCells) {
      setCell(rr, cc, fillColor)
    }

    // 四方向扩展
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= gridH.value || nc < 0 || nc >= gridW.value) continue
      const key = `${nr},${nc}`
      if (visited.has(key)) continue
      visited.add(key)
      queue.push([nr, nc])
    }
  }

  saveSnapshot()
  renderAll()
}

function getSymmetryCellsGeneric(r, c) {
  const cells = [[r, c]]
  const m = symmetryMode.value
  if (m === 'h' || m === 'quad') cells.push([r, gridW.value - 1 - c])
  if (m === 'v' || m === 'quad') cells.push([gridH.value - 1 - r, c])
  if (m === 'quad') cells.push([gridH.value - 1 - r, gridW.value - 1 - c])
  return cells
}

// ---- 杂色清理 ----
function removeNoise() {
  const THRESHOLD = 3
  const visited = Array.from({ length: gridH.value }, () => Array(gridW.value).fill(false))
  const toClear = []
  for (let r = 0; r < gridH.value; r++) {
    for (let c = 0; c < gridW.value; c++) {
      if (visited[r][c]) continue
      const cell = getCell(r, c)
      if (!cell?.hex) { visited[r][c] = true; continue }
      // BFS 找连通域
      const group = []
      const queue = [[r, c]]
      visited[r][c] = true
      while (queue.length) {
        const [cr, cc] = queue.shift()
        group.push([cr, cc])
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nr = cr + dr, nc = cc + dc
          if (nr < 0 || nr >= gridH.value || nc < 0 || nc >= gridW.value) continue
          if (visited[nr][nc]) continue
          const nc2 = getCell(nr, nc)
          if (nc2?.hex?.toUpperCase() === cell.hex.toUpperCase()) {
            visited[nr][nc] = true
            queue.push([nr, nc])
          }
        }
      }
      if (group.length < THRESHOLD) toClear.push(...group)
    }
  }
  for (const [r, c] of toClear) setCell(r, c, null)
  saveSnapshot()
  renderAll()
  toast.show(`已清理 ${toClear.length} 个杂色像素`)
}

// ---- 缩放 ----
function setZoom(v) { zoom.value = Math.max(0.5, Math.min(30, v)) }
function zoomIn() { setZoom(zoom.value * 1.25) }
function zoomOut() { setZoom(zoom.value * 0.8) }
function zoomToFit() {
  if (!editorCanvasRef.value) return
  const wrap = editorCanvasRef.value.canvasWrap
  if (!wrap) return
  const fitW = (wrap.clientWidth - 80) / gridW.value
  const fitH = (wrap.clientHeight - 80) / gridH.value
  zoom.value = Math.max(0.5, Math.min(30, Math.floor(Math.min(fitW, fitH))))
  panX.value = 0; panY.value = 0
}
function zoomTo1x() { zoom.value = 10; panX.value = 0; panY.value = 0 }

// ---- 导出 ----
async function exportPNG() {
  toast.show('正在生成高清 PNG...')
  try {
    const blob = await API.download('/api/export/grid', {
      gridData: grid.value, gridWidth: gridW.value, gridHeight: gridH.value,
      scale: 10
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = (editTitle.value || '拼豆图纸') + '.png'
    a.click(); URL.revokeObjectURL(url)
    toast.show('PNG 导出成功')
  } catch (e) { toast.show('导出失败，请稍后重试') }
}

async function exportPDFFile() {
  toast.show('正在生成 PDF 图纸...')
  try {
    const blob = await API.download('/api/export/pdf', {
      gridData: grid.value, gridWidth: gridW.value, gridHeight: gridH.value,
      title: editTitle.value
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = (editTitle.value || '拼豆图纸') + '.pdf'
    a.click(); URL.revokeObjectURL(url)
    toast.show('PDF 导出成功')
  } catch (e) { toast.show('导出失败，请稍后重试') }
}

function exportJSONFile() {
  const data = {
    title: editTitle.value,
    gridW: gridW.value, gridH: gridH.value,
    grid: grid.value, version: '2.0'
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = (editTitle.value || '拼豆图纸') + '.json'
  a.click(); URL.revokeObjectURL(url)
  toast.show('JSON 导出成功')
}

// ---- 图片导入 ----
function triggerImport() { fileInput.value?.click() }

async function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  toast.show('正在分析图片...')
  try {
    const formData = new FormData()
    formData.append('file', file)           // 后端 multer 使用 'file' 字段名
    formData.append('targetWidth', gridW.value) // 后端期望 targetWidth
    const res = await API.upload('/api/image-to-grid', formData)
    if (res.code === 200 && res.data) {
      gridW.value = res.data.gridWidth
      gridH.value = res.data.gridHeight
      grid.value = res.data.grid
      if (res.data.refImage) {
        refImage.value = res.data.refImage
        refW.value = res.data.gridWidth
        refH.value = res.data.gridHeight
        refPixels.value = res.data.grid
        refOpacity.value = 0.3
      }
      saveSnapshot()
      nextTick(() => { editorCanvasRef.value?.initCanvas(); renderAll() })
      toast.show('图片转换完成')
    }
  } catch (e) { toast.show('图片分析失败，请稍后重试') }
  fileInput.value.value = ''
}

// ---- 画布尺寸预设 ----
const sizePresets = [
  { label: '小', w: 29, h: 29, desc: '迷你钥匙扣' },
  { label: '中', w: 58, h: 58, desc: '标准拼豆板' },
  { label: '大', w: 87, h: 87, desc: '大幅作品' },
  { label: '横版', w: 87, h: 58, desc: '横版装饰画' },
  { label: '竖版', w: 58, h: 87, desc: '竖版挂件' },
]
const showSizePicker = ref(false)

function startBlank() {
  showSizePicker.value = true
}

function confirmSize(w, h) {
  gridW.value = w; gridH.value = h
  showSizePicker.value = false
  inEditor.value = true
  initGrid(gridW.value, gridH.value)
  saveSnapshot()
  nextTick(() => { editorCanvasRef.value?.initCanvas(); renderAll() })
}

async function loadRecentDesigns() {
  try {
    const res = await API.get('/api/designs?limit=5&sort=updated', true)
    if (res.code === 200) recentDesigns.value = res.data || []
  } catch (_) { /* offline */ }
}

async function openDesign(id) {
  try {
    const res = await API.get(`/api/designs/${id}`)
    if (res.code === 200 && res.data) {
      const d = res.data
      editId.value = d.id
      editTitle.value = d.title || '未命名图纸'
      gridW.value = d.gridWidth
      gridH.value = d.gridHeight
      grid.value = typeof d.gridData === 'string' ? JSON.parse(d.gridData) : d.gridData
      saveSnapshot()
      inEditor.value = true
      nextTick(() => { editorCanvasRef.value?.initCanvas(); renderAll() })
    }
  } catch (_) { toast.show('加载设计失败') }
}

function renderRecentThumb(el, design) {
  if (!el || !design.gridData) return
  nextTick(() => {
    const grid = typeof design.gridData === 'string' ? JSON.parse(design.gridData) : design.gridData
    if (!grid) return
    const canvas = el
    const ctx = canvas.getContext('2d')
    canvas.width = design.gridWidth
    canvas.height = design.gridHeight
    ctx.imageSmoothingEnabled = false
    for (let r = 0; r < Math.min(design.gridHeight, grid.length); r++) {
      const row = grid[r]
      if (!row) continue
      for (let c = 0; c < Math.min(design.gridWidth, row.length); c++) {
        ctx.fillStyle = row[c]?.hex || '#f0f0f0'
        ctx.fillRect(c, r, 1, 1)
      }
    }
  })
}

async function generateAi() {
  if (!aiPrompt.value.trim() || aiGenerating.value) return
  aiGenerating.value = true
  try {
    const res = await API.post('/api/ai/generate', { prompt: aiPrompt.value, brand: aiBrand.value, width: aiSize.value, height: aiSize.value })
    if (res.code === 200 && res.data?.grid) {
      gridW.value = res.data.gridWidth || aiSize.value
      gridH.value = res.data.gridHeight || aiSize.value
      grid.value = res.data.grid
      editId.value = null
      editTitle.value = aiPrompt.value
      showAiPrompt.value = false
      inEditor.value = true
      saveSnapshot()
      nextTick(() => { editorCanvasRef.value?.initCanvas(); renderAll() })
    }
  } catch (_) { toast.show('AI 生成失败，请稍后重试') }
  aiGenerating.value = false
}

// ---- 保存 ----
async function saveDesign() {
  if (!editTitle.value.trim()) {
    const name = await dialog.prompt('请输入图纸名称', '保存图纸', editTitle.value || '未命名图纸')
    if (name) editTitle.value = name
    else return
  }
  try {
    const payload = {
      title: editTitle.value, gridWidth: gridW.value, gridHeight: gridH.value,
      gridData: JSON.stringify(grid.value), beadCount: beadCount.value,
      colorCount: gridColorStats.value.length
    }
    if (editId.value) {
      await API.put(`/api/designs/${editId.value}`, payload, true)
    } else {
      const res = await API.post('/api/designs', payload, true)
      editId.value = res.data?.id
    }
    hasUnsavedChanges.value = false
    toast.show('保存成功')
  } catch (e) { toast.show('保存失败，请稍后重试') }
}

async function confirmClear() {
  const ok = await dialog.confirm('确定要清空画布吗？此操作不可撤销。')
  if (ok) { initGrid(gridW.value, gridH.value); saveSnapshot(); renderAll() }
}

// ---- 自动保存 ----
function autoSave() {
  if (!hasUnsavedChanges.value) return
  try {
    const data = { grid: grid.value, gridW: gridW.value, gridH: gridH.value, editId: editId.value, title: editTitle.value, time: Date.now() }
    localStorage.setItem(autoSaveKey.value, JSON.stringify(data))
  } catch (_) { /* quota exceeded */ }
}

function clearAutoSave() {
  try { localStorage.removeItem(autoSaveKey.value) } catch (_) { /* noop */ }
}

function restoreAutoSave() {
  try {
    const raw = localStorage.getItem(autoSaveKey.value)
    if (!raw) return false
    const data = JSON.parse(raw)
    // 超过24小时自动清除
    if (Date.now() - data.time > 24 * 3600 * 1000) { clearAutoSave(); return false }
    // 返回草稿数据，由调用方决定是否恢复
    return data
  } catch (_) { return false }
}

// ---- 退出 ----
function exitEditor() {
  // 有未保存更改时弹窗确认
  if (hasUnsavedChanges.value) {
    if (!window.confirm('有未保存的更改，确定退出吗？')) return
  }
  // 退出后清除自动保存草稿
  clearAutoSave()
  hasUnsavedChanges.value = false
  // 返回入口页，重新加载最近设计
  inEditor.value = false
  initGrid(gridW.value, gridH.value)
  saveSnapshot()
  loadRecentDesigns()
}

// ---- 快捷键 ----
function onGlobalKeyDown(e) {
  // 在输入框中不处理
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return

  const key = e.key.toLowerCase()
  if ((e.ctrlKey || e.metaKey) && key === 'z') { e.preventDefault(); undo(); renderAll(); return }
  if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); renderAll(); return }
  if ((e.ctrlKey || e.metaKey) && key === 's') { e.preventDefault(); saveDesign(); return }
  if ((e.ctrlKey || e.metaKey) && key === 'c') { e.preventDefault(); copySelection(); return }
  if ((e.ctrlKey || e.metaKey) && key === 'v') { e.preventDefault(); pasteSelection(); return }
  if ((e.ctrlKey || e.metaKey) && key === 'l') { e.preventDefault(); toggleRefLock(); return }
  if ((e.ctrlKey || e.metaKey) && key === 'n') { e.preventDefault(); toggleGuideMode(); return }
  if (key === 'delete' || key === 'backspace') { e.preventDefault(); deleteSelection(); return }

  switch (key) {
    case 'b': tool.value = 'brush'; break
    case 'e': tool.value = 'eraser'; break
    case 'g': case 'f': tool.value = 'fill'; break
    case 'i': tool.value = 'picker'; break
    case 's': tool.value = 'select'; break
    case 'r': tool.value = 'replace'; break
    case 'm': tool.value = 'move'; break
    case 'h': showGrid.value = !showGrid.value; break
    case 'k': cycleSymmetry(); break
    case '[': brushSize.value = Math.max(1, brushSize.value - 1); break
    case ']': brushSize.value = Math.min(8, brushSize.value + 1); break
    default: return
  }
  e.preventDefault()
}

// ---- 生命周期 ----
onMounted(async () => {
  // 加载珠子数据（入口页和编辑器都需要）
  try {
    const res = await API.get('/api/beads/colors')
    if (res.code === 200) beadData.value = res.data || []
  } catch (_) { /* offline */ }

  // 加载库存
  if (auth.isLoggedIn.value) {
    try {
      const res = await API.get('/api/inventory', true)
      if (res.code === 200 && res.data) {
        for (const item of res.data) inventory.value[item.color_id] = item.quantity
      }
    } catch (_) { /* offline */ }
  }

  // 判断是打开已有设计还是显示入口页
  const designId = route.params.id
  if (designId) {
    // 直接打开已有设计进入编辑器
    try {
      const res = await API.get(`/api/designs/${designId}`)
      if (res.code === 200 && res.data) {
        const d = res.data
        editId.value = d.id
        editTitle.value = d.title || '未命名图纸'
        gridW.value = d.gridWidth
        gridH.value = d.gridHeight
        grid.value = typeof d.gridData === 'string' ? JSON.parse(d.gridData) : d.gridData
        saveSnapshot()
        inEditor.value = true
        nextTick(() => { editorCanvasRef.value?.initCanvas(); renderAll() })
      }
    } catch (_) { /* 加载失败，显示入口页 */ }
  } else {
    // 检查是否有从其他页面导入的数据（照片转图纸 / OCR / 链接导入）
    const importedRaw = sessionStorage.getItem('imported_grid')
    if (importedRaw) {
      try {
        const imported = JSON.parse(importedRaw)
        sessionStorage.removeItem('imported_grid') // 清除，防止下次重复加载
        if (imported.grid && imported.gridWidth && imported.gridHeight) {
          gridW.value = imported.gridWidth
          gridH.value = imported.gridHeight
          grid.value = imported.grid
          editId.value = null
          editTitle.value = '导入图纸'
          inEditor.value = true
          saveSnapshot()
          nextTick(() => { editorCanvasRef.value?.initCanvas(); renderAll() })
          return
        }
      } catch (_) { /* 数据异常，继续显示入口页 */ }
    }

    // 显示创作入口页，加载最近设计
    clearAutoSave()
    initGrid(gridW.value, gridH.value)
    saveSnapshot()
    loadRecentDesigns()
  }

  window.addEventListener('keydown', onGlobalKeyDown)
  window.addEventListener('beforeunload', onBeforeUnload)

  // 自动保存定时器
  autoSaveTimer.value = setInterval(autoSave, 5000)
})

function onBeforeUnload(e) {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    e.returnValue = ''  // Chrome 需要设置 returnValue
  }
}

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeyDown)
  window.removeEventListener('beforeunload', onBeforeUnload)
  if (autoSaveTimer.value) clearInterval(autoSaveTimer.value)
  autoSave()  // 最后保存一次
})
</script>
