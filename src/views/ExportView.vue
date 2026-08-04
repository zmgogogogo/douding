<template>
  <!-- 全屏导出页面 — 参考 dmao.cloud 设计 -->
  <div class="bg-[#F2F2F7] flex flex-col overflow-hidden" style="height:100svh">
    <!-- 加载状态 -->
    <div v-if="loading" class="absolute inset-0 z-50 bg-[#F2F2F7] flex flex-col items-center justify-center gap-4">
      <div class="w-10 h-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p class="text-sm text-slate-500 font-medium">正在准备导出数据…</p>
    </div>

    <!-- 空数据状态 -->
    <div v-else-if="!gridData.length" class="absolute inset-0 z-50 bg-[#F2F2F7] flex flex-col items-center justify-center gap-4">
      <div class="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center">
        <ImageIcon :size="28" class="text-slate-400" />
      </div>
      <p class="text-sm font-semibold text-slate-600">暂无图纸数据</p>
      <p class="text-xs text-slate-400">请从编辑器或作品详情页进入导出</p>
      <button @click="$router.back()" class="mt-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-medium">
        返回
      </button>
    </div>

    <template v-else>
      <!-- ====== 全屏缩放预览（点击预览区触发） ====== -->
      <Teleport to="body">
        <div v-if="zooming" class="fixed inset-0 z-[300] bg-black/88 backdrop-blur-md flex flex-col"
          style="touch-action:none" @wheel.prevent="onZoomWheel">
          <!-- 缩放控件 -->
          <div class="flex-shrink-0 flex items-center justify-center px-4 pt-4 pb-2">
            <div class="flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/15 px-3 py-2 rounded-full whitespace-nowrap">
              <button :disabled="zoomBusy" class="w-8 h-8 flex items-center justify-center bg-white/12 border border-white/15 rounded-lg text-white disabled:opacity-30"
                @click="zoomScale = Math.max(0.5, zoomScale - 0.5)">
                <MinusIcon :size="14" />
              </button>
              <span class="text-[12px] font-bold text-white/80 min-w-[44px] text-center font-mono">{{ Math.round(zoomScale * 100) }}%</span>
              <button :disabled="zoomBusy" class="w-8 h-8 flex items-center justify-center bg-white/12 border border-white/15 rounded-lg text-white disabled:opacity-30"
                @click="zoomScale = Math.min(8, zoomScale + 0.5)">
                <PlusIcon :size="14" />
              </button>
              <button :disabled="zoomBusy" class="px-3 h-8 flex items-center justify-center bg-white/12 border border-white/15 rounded-lg text-white text-[11px] font-bold disabled:opacity-30"
                @click="zoomScale = 1; zoomPanX = 0; zoomPanY = 0">
                1:1
              </button>
            </div>
          </div>
          <!-- 缩放画布 -->
          <div class="flex-1 min-h-0 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
            style="user-select:none"
            @touchstart.prevent="onZoomTouchStart"
            @touchmove.prevent="onZoomTouchMove"
            @touchend="onZoomTouchEnd"
            @mousedown="onZoomMouseDown"
            @mousemove="onZoomMouseMove"
            @mouseup="onZoomMouseUp"
            @mouseleave="onZoomMouseUp">
            <canvas ref="zoomCanvasRef"
              :style="zoomCanvasStyle"
              class="block"
              style="image-rendering:pixelated;border-radius:6px;box-shadow:0 8px 40px rgba(0,0,0,0.5);transform-origin:center center;transition:transform 0.08s ease-out">
            </canvas>
          </div>
          <!-- 关闭按钮 -->
          <button class="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 hover:bg-black/70 active:scale-90 text-white text-[10px] font-semibold px-2 py-1 rounded-full transition-all"
            style="-webkit-tap-highlight-color:transparent" @click="zooming = false">
            <XIcon :size="11" /> 关闭
          </button>
        </div>
      </Teleport>

      <!-- ====== 顶部导航 ====== -->
      <nav class="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/50 flex items-center justify-between px-4 h-14 flex-shrink-0">
        <div class="flex items-center gap-2">
          <button @click="$router.back()" class="p-2 hover:bg-slate-100 rounded-full transition-all">
            <ArrowLeftIcon :size="20" />
          </button>
          <h1 class="font-bold text-[17px]">导出图纸</h1>
        </div>
        <!-- 分辨率选择 -->
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-slate-400 font-mono">{{ canvasWidth }}×{{ canvasHeight }}px</span>
          <div class="bg-slate-100 p-1 rounded-xl flex gap-1">
            <button v-for="r in resolutions" :key="r.key"
              :class="[
                'px-2.5 py-1 rounded-lg flex flex-col items-center transition-all',
                selectedResolution === r.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              ]"
              @click="selectedResolution = r.key">
              <span class="text-[12px] font-bold">{{ r.label }}</span>
            </button>
          </div>
        </div>
      </nav>

      <!-- ====== 主体：预览 + 配置 ====== -->
      <div class="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        <!-- 左侧：实时预览 -->
        <div class="md:flex-1 flex-shrink-0 bg-[#F2F2F7] flex flex-col relative"
          :style="isMobile ? 'height:38svh;height:38dvh;' : ''">
          <div ref="previewAreaRef" class="flex-1 flex items-center justify-center p-3 overflow-hidden"
            @click="openZoom">
            <div class="relative flex items-center justify-center w-full h-full">
              <canvas ref="previewCanvasRef" class="block max-w-full max-h-full"
                style="image-rendering:pixelated;border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,0.12),0 1px 3px rgba(0,0,0,0.06);border:1px solid #e4e4e7">
              </canvas>
              <!-- 渲染中遮罩 -->
              <div v-if="rendering" class="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 rounded-xl">
                <div class="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <span class="text-xs text-slate-400">渲染中…</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：配置面板 -->
        <div class="flex-1 min-h-0 md:w-[320px] md:flex-none bg-white flex flex-col overflow-hidden border-t md:border-t-0 md:border-l border-slate-200/60">
          <div class="flex-1 min-h-0 overflow-y-auto" style="scrollbar-width:thin;-webkit-overflow-scrolling:touch;overscroll-behavior:contain">

            <!-- ====== 辅助线 ====== -->
            <div class="px-4 py-3 border-b border-slate-100">
              <button class="w-full flex items-center justify-between mb-2.5" @click="toggleSection('guide')">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">辅助线</span>
                <ChevronDownIcon :size="14" :class="['text-slate-400 transition-transform', sections.guide ? '' : '-rotate-90']" />
              </button>
              <div v-if="sections.guide" class="space-y-2.5">
                <!-- 模式选择 -->
                <div class="bg-slate-100 p-1 rounded-xl flex gap-1">
                  <button v-for="m in guideModes" :key="m.key"
                    :class="[
                      'flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                      guideMode === m.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    ]"
                    @click="guideMode = m.key">
                    {{ m.label }}
                  </button>
                </div>
                <!-- 自定义间隔 -->
                <div v-if="guideMode === 'custom'" class="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                  <span class="text-[12px] text-slate-500">间隔</span>
                  <input type="number" v-model.number="customGuideInterval" min="1" max="50"
                    class="w-14 px-2 py-1 text-center text-[13px] font-bold border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                    @change="onConfigChange" />
                  <span class="text-[12px] text-slate-500">格</span>
                </div>
                <!-- 网格线颜色 + 透明度 -->
                <div class="flex items-center gap-2">
                  <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl flex-1">
                    <span class="text-[12px] text-slate-500">颜色</span>
                    <input type="color" v-model="gridColor" class="w-5 h-5 rounded cursor-pointer border-0 p-0" @change="onConfigChange" />
                    <span class="text-[11px] font-mono text-primary w-8 text-right">{{ gridColor }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                  <span class="text-[12px] text-slate-500">透明度</span>
                  <input type="range" v-model.number="gridOpacity" min="5" max="100" class="flex-1 h-1 accent-primary" @input="onConfigChange" />
                  <span class="text-[11px] font-mono text-primary w-8 text-right">{{ gridOpacity }}%</span>
                </div>
                <!-- 加粗线颜色 + 透明度 -->
                <div class="flex items-center gap-2">
                  <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl flex-1">
                    <span class="text-[12px] text-slate-500">加粗</span>
                    <input type="color" v-model="boldGridColor" class="w-5 h-5 rounded cursor-pointer border-0 p-0" @change="onConfigChange" />
                    <span class="text-[11px] font-mono text-primary w-8 text-right">{{ boldGridColor }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                  <span class="text-[12px] text-slate-500">粗线透明度</span>
                  <input type="range" v-model.number="boldGridOpacity" min="5" max="100" class="flex-1 h-1 accent-primary" @input="onConfigChange" />
                  <span class="text-[11px] font-mono text-primary w-8 text-right">{{ boldGridOpacity }}%</span>
                </div>
              </div>
            </div>

            <!-- ====== 叠加层 ====== -->
            <div class="px-4 py-3 border-b border-slate-100">
              <button class="w-full flex items-center justify-between mb-2.5" @click="toggleSection('overlay')">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">叠加层</span>
                <ChevronDownIcon :size="14" :class="['text-slate-400 transition-transform', sections.overlay ? '' : '-rotate-90']" />
              </button>
              <div v-if="sections.overlay" class="grid grid-cols-2 gap-2">
                <label v-for="s in overlaySwitches" :key="s.key"
                  class="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-100/80 transition-all"
                  @click="s.key === 'showGrid' ? showGrid = !showGrid : s.key === 'showColorLabel' ? showColorLabel = !showColorLabel : s.key === 'showBeadList' ? showBeadList = !showBeadList : showBorder = !showBorder; onConfigChange()">
                  <span class="text-[12px] font-semibold text-slate-700">{{ s.label }}</span>
                  <div :class="[
                    'w-8 h-[18px] rounded-full relative transition-all duration-200 flex-shrink-0',
                    (s.key === 'showGrid' ? showGrid : s.key === 'showColorLabel' ? showColorLabel : s.key === 'showBeadList' ? showBeadList : showBorder) ? 'bg-primary' : 'bg-slate-200'
                  ]">
                    <div class="absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-sm transition-all duration-200"
                      :style="{ left: (s.key === 'showGrid' ? showGrid : s.key === 'showColorLabel' ? showColorLabel : s.key === 'showBeadList' ? showBeadList : showBorder) ? '16px' : '2px' }">
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <!-- ====== 边框 ====== -->
            <div class="px-4 py-3 border-b border-slate-100">
              <button class="w-full flex items-center justify-between mb-2.5" @click="toggleSection('border')">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">边框</span>
                <ChevronDownIcon :size="14" :class="['text-slate-400 transition-transform', sections.border ? '' : '-rotate-90']" />
              </button>
              <div v-if="sections.border" class="grid grid-cols-2 gap-2">
                <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                  <span class="text-[12px] text-slate-500">底色</span>
                  <input type="color" v-model="borderColor" class="w-5 h-5 rounded cursor-pointer border-0 p-0" @change="onConfigChange" />
                </div>
                <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                  <span class="text-[12px] text-slate-500">文字</span>
                  <input type="color" v-model="borderTextColor" class="w-5 h-5 rounded cursor-pointer border-0 p-0" @change="onConfigChange" />
                </div>
              </div>
            </div>

            <!-- ====== 水印 ====== -->
            <div class="px-4 py-3 border-b border-slate-100">
              <button class="w-full flex items-center justify-between mb-2.5" @click="toggleSection('watermark')">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">水印</span>
                <ChevronDownIcon :size="14" :class="['text-slate-400 transition-transform', sections.watermark ? '' : '-rotate-90']" />
              </button>
              <div v-if="sections.watermark" class="space-y-2.5">
                <input v-model="watermarkText" maxlength="30"
                  class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                  :disabled="forceWatermark" @input="onConfigChange" />
                <div class="flex items-center gap-2">
                  <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl flex-1">
                    <span class="text-[12px] text-slate-500">颜色</span>
                    <input type="color" v-model="watermarkColor" class="w-5 h-5 rounded cursor-pointer border-0 p-0" @change="onConfigChange" />
                  </div>
                </div>
                <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                  <span class="text-[12px] text-slate-500">透明度</span>
                  <input type="range" v-model.number="watermarkOpacity" min="5" max="100" class="flex-1 h-1 accent-primary" @input="onConfigChange" />
                  <span class="text-[11px] font-mono text-primary w-8 text-right">{{ watermarkOpacity }}%</span>
                </div>
              </div>
            </div>

            <!-- ====== 用料清单 ====== -->
            <div class="px-4 py-3 border-b border-slate-100">
              <button class="w-full flex items-center justify-between mb-2.5" @click="toggleSection('beadList')">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">用料清单<span v-if="brandName">（{{ brandName }}）</span></span>
                <ChevronDownIcon :size="14" :class="['text-slate-400 transition-transform', sections.beadList ? '' : '-rotate-90']" />
              </button>
              <div v-if="sections.beadList" class="space-y-2.5">
                <!-- 排序 -->
                <div class="bg-slate-100 p-1 rounded-xl flex gap-1">
                  <button v-for="s in sortOptions" :key="s.key"
                    :class="[
                      'flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                      sortMode === s.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    ]"
                    @click="sortMode = s.key">
                    {{ s.label }}
                  </button>
                </div>
                <!-- 色块列表 -->
                <div class="space-y-1 max-h-[200px] overflow-y-auto">
                  <div v-for="b in sortedBeadUsage" :key="b.code"
                    class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                    <div class="w-5 h-5 rounded flex-shrink-0 border border-slate-200"
                      :style="{ backgroundColor: b.hex }"></div>
                    <span class="text-[11px] font-mono font-bold text-slate-700 flex-shrink-0 w-10">{{ b.code }}</span>
                    <span class="text-[11px] text-slate-500 truncate flex-1">{{ b.name }}</span>
                    <span class="text-[11px] font-semibold text-slate-700 flex-shrink-0">{{ b.count }}</span>
                  </div>
                </div>
                <div class="text-[10px] text-slate-400 text-right">
                  {{ beadUsageList.length }} 色 · {{ totalBeads.toLocaleString() }} 颗
                </div>
              </div>
            </div>
          </div>

          <!-- ====== 底部下载按钮 ====== -->
          <div class="p-4 bg-white border-t border-slate-100 flex gap-3 flex-shrink-0">
            <button @click="downloadPNG" :disabled="exporting"
              class="flex-[2.5] py-3 rounded-2xl bg-primary text-white font-bold text-[14px] shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              <div v-if="exporting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <DownloadIcon v-else :size="17" />
              {{ exporting ? '导出中…' : '下载 PNG' }}
            </button>
            <button @click="shareImage" v-if="canShare"
              class="flex-[2] py-3 rounded-2xl bg-primary text-white font-bold text-[14px] shadow-lg shadow-primary/20 active:scale-95 flex items-center justify-center gap-2">
              <Share2Icon :size="17" /> 分享
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
/* global File, URL */
// ============================================
//  ExportView — 拼豆图纸可视化导出页面
//  参考 dmao.cloud 设计
// ============================================
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  ArrowLeft as ArrowLeftIcon,
  Download as DownloadIcon,
  Share2 as Share2Icon,
  ChevronDown as ChevronDownIcon,
  Minus as MinusIcon,
  Plus as PlusIcon,
  X as XIcon,
  Image as ImageIcon,
} from 'lucide-vue-next'

const route = useRoute()

// ==================== 数据加载 ====================

const gridData = ref([])        // 一维数组 colorId[]
const colorMap = ref(new Map()) // colorId → { id, code, hex, name }
const gridWidth = ref(32)
const gridHeight = ref(32)
const designTitle = ref('拼豆图纸')
const loading = ref(true)
const forceWatermark = ref(false)
const brandLogoImage = ref(null)  // 预加载的品牌 logo

/** 从 localStorage 加载网格数据 */
function loadCanvasData() {
  try {
    const raw = localStorage.getItem('export-canvas-data')
    if (raw) {
      const data = JSON.parse(raw)
      if (data.width) gridWidth.value = data.width
      if (data.height) gridHeight.value = data.height
      if (data.title) designTitle.value = data.title
      if (data.pixels) gridData.value = data.pixels
      else if (data.grid) {
        // 如果是二维数组，展平并提取 hex 字符串作为 colorMap key
        const flat = []
        for (let r = 0; r < data.grid.length; r++) {
          const row = data.grid[r]
          if (!row) { for (let c = 0; c < gridWidth.value; c++) flat.push(null); continue }
          for (let c = 0; c < gridWidth.value; c++) {
            const cell = row[c]
            flat.push(cell?.hex ? cell.hex.toUpperCase() : null)
          }
        }
        gridData.value = flat
      }
    }

    const cmRaw = localStorage.getItem('export-color-map')
    if (cmRaw) {
      const entries = JSON.parse(cmRaw)
      colorMap.value = new Map(entries.map(e => [e.id, e]))
    }

    // 水印：如果来自他人作品，强制水印
    if (route.query.forceWatermark === '1') {
      forceWatermark.value = true
    }
    const authorName = route.query.authorName || ''
    if (forceWatermark.value && authorName) {
      watermarkText.value = `@${authorName.replace(/^@+/, '')}`
    } else {
      // 取当前用户昵称
      try {
        const profile = JSON.parse(localStorage.getItem('douding_user') || '{}')
        if (profile.nickname) watermarkText.value = `@${profile.nickname.replace(/^@+/, '')}`
      } catch { /* ignore */ }
    }
  } catch (e) {
    console.warn('[Export] 加载数据失败:', e)
  }
  loading.value = false
}

// ==================== 分辨率 ====================

const resolutions = [
  { key: '1k', label: '1K', targetPx: 1024 },
  { key: '2k', label: '2K', targetPx: 2048 },
  { key: '4k', label: '4K', targetPx: 4096 },
  { key: '8k', label: '8K', targetPx: 8192 },
]
const selectedResolution = ref('2k')

const MIN_CELL_SIZE = 4
const MAX_CELL_SIZE = 256

/** 根据分辨率和画布尺寸计算 cellSize */
const scale = computed(() => {
  const opt = resolutions.find(r => r.key === selectedResolution.value) || resolutions[1]
  const maxDim = Math.max(gridWidth.value, gridHeight.value)
  const cs = Math.floor(opt.targetPx / maxDim)
  return Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, cs))
})

// ==================== 辅助线 ====================

const guideMode = ref('10')
const guideModes = [
  { key: 'none', label: '无' },
  { key: '5', label: '5格' },
  { key: '10', label: '10格' },
  { key: 'custom', label: '自定义' },
]
const customGuideInterval = ref(5)
const gridColor = ref('#64748b')
const gridOpacity = ref(28)
const boldGridColor = ref('#000000')
const boldGridOpacity = ref(55)

const boldInterval = computed(() => {
  if (guideMode.value === 'none') return 0
  if (guideMode.value === 'custom') return customGuideInterval.value
  return parseInt(guideMode.value)
})

// ==================== 叠加层开关 ====================

const showGrid = ref(true)
const showColorLabel = ref(true)
const showBorder = ref(true)
const showBeadList = ref(true)

const overlaySwitches = [
  { key: 'showGrid', label: '显示网格线' },
  { key: 'showColorLabel', label: '显示色号' },
  { key: 'showBorder', label: '显示边框' },
  { key: 'showBeadList', label: '显示用料清单' },
]

// ==================== 边框 ====================

const borderColor = ref('#f1f5f9')
const borderTextColor = ref('#334155')

// ==================== 水印 ====================

const watermarkText = ref('')
const watermarkColor = ref('#000000')
const watermarkOpacity = ref(10)

// ==================== 用料清单 ====================

const sortMode = ref('code')
const sortOptions = [
  { key: 'code', label: '按色号' },
  { key: 'count', label: '按用量' },
]

/** 从 colorMap 中提取品牌名（取第一个非空 brand） */
const brandName = computed(() => {
  for (const [, v] of colorMap.value) {
    if (v.brand) return v.brand
  }
  return ''
})

/** 统计每种颜色的使用量 */
const beadUsageList = computed(() => {
  const usage = {}
  for (const id of gridData.value) {
    if (!id) continue
    const info = colorMap.value.get(id)
    if (!info) continue
    const code = info.code || String(id)
    if (!usage[code]) {
      usage[code] = { id, code, hex: info.hex || '#cccccc', name: info.name || code, count: 0 }
    }
    usage[code].count++
  }
  return Object.values(usage)
})

const totalBeads = computed(() => beadUsageList.value.reduce((s, b) => s + b.count, 0))

const sortedBeadUsage = computed(() => {
  const list = [...beadUsageList.value]
  if (sortMode.value === 'count') {
    return list.sort((a, b) => b.count - a.count || a.code.localeCompare(b.code, undefined, { numeric: true }))
  }
  return list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }))
})

// ==================== 折叠面板 ====================

const sections = ref({
  guide: true,
  overlay: true,
  border: true,
  watermark: true,
  beadList: true,
})

function toggleSection(key) {
  sections.value[key] = !sections.value[key]
}

// ==================== Canvas 渲染 ====================

const previewCanvasRef = ref(null)
const previewAreaRef = ref(null)
const rendering = ref(false)
const exporting = ref(false)

/** 亮度计算 — 用于文字颜色自适应 */
function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** hex 转 rgba */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${(alpha / 100).toFixed(2)})`
}

/** 绘制圆角矩形路径 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/** 计算导出画布尺寸 */
const canvasWidth = computed(() => gridWidth.value * scale.value + borderPadding.value * 2)
const canvasHeight = computed(() => {
  let h = gridHeight.value * scale.value + borderPadding.value * 2
  // 顶部品牌栏（始终显示）
  h += headerHeight.value
  // 底部用料清单
  if (showBeadList.value) h += beadListHeight.value
  return h
})

const borderPadding = computed(() => showBorder.value ? Math.max(Math.round(scale.value * 2.5), Math.round(scale.value * gridWidth.value * 0.06)) : 0)
const headerHeight = computed(() => Math.max(44, Math.round(scale.value * 4.5)))

/** 用料清单高度 */
const beadListHeight = computed(() => {
  if (!showBeadList.value || beadUsageList.value.length === 0) return 0
  const cardW = Math.max(108, Math.round(scale.value * 6.6))
  const cardH = Math.max(132, Math.round(scale.value * 8.4))
  const gap = Math.max(4, Math.round(scale.value * 0.25))
  const availW = Math.max(1, gridWidth.value * scale.value + borderPadding.value * 2 - 40 + gap)
  const itemsPerRow = Math.max(1, Math.floor(availW / (cardW + gap)))
  const rows = Math.ceil(beadUsageList.value.length / itemsPerRow)
  return rows * (cardH + gap) + 100
})

/** 主渲染函数 */
function renderCanvas(canvas, width, height) {
  const ctx = canvas.getContext('2d')
  canvas.width = width
  canvas.height = height

  const cs = scale.value
  const bp = borderPadding.value
  const gw = gridWidth.value
  const gh = gridHeight.value

  // 1. 白色背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // 2. 顶部品牌栏：左(logo+豆丁 / 网址) | 竖线 | 右(作品名称)
  const headerH = Math.max(44, Math.round(cs * 4.5))
  const padH = Math.round(headerH * 0.16)

  // 背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, headerH)

  // 底部分隔线
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = Math.max(0.5, Math.round(headerH * 0.02))
  ctx.beginPath()
  ctx.moveTo(0, headerH)
  ctx.lineTo(width, headerH)
  ctx.stroke()

  // === 左侧：logo 图片 + "豆丁"文字（上）/ 网址（下） ===
  const logoH = Math.round(headerH * 0.58)
  const logoX = padH
  const logoY = (headerH - logoH) / 2 - Math.round(headerH * 0.05)

  // logo 图片
  const brandLogo = brandLogoImage.value
  if (brandLogo && brandLogo.complete && brandLogo.naturalWidth > 0) {
    ctx.drawImage(brandLogo, logoX, logoY, logoH, logoH)
  } else {
    ctx.fillStyle = '#0058BC'
    roundRect(ctx, logoX, logoY, logoH, logoH, Math.round(logoH * 0.2))
    ctx.fill()
  }

  // "豆丁" 文字（logo 右侧）
  const brandFontSize = Math.max(11, Math.round(headerH * 0.28))
  const brandTextX = logoX + logoH + Math.round(padH * 0.5)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#1e293b'
  ctx.font = `700 ${brandFontSize}px 'PingFang SC', sans-serif`
  ctx.fillText('豆丁', brandTextX, logoY + logoH * 0.65)

  // 网址（logo 下方，与 logo 左边对齐）
  const urlFontSize = Math.max(8, Math.round(headerH * 0.16))
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#94a3b8'
  ctx.font = `${urlFontSize}px 'PingFang SC', sans-serif`
  const urlText = 'www.douding.online'
  ctx.fillText(urlText, logoX, logoY + logoH + Math.round(headerH * 0.04))

  // 测量左侧内容宽度，竖线在右侧 10px 处
  const urlWidth = ctx.measureText(urlText).width
  const brandWidth = ctx.measureText('豆丁').width
  const leftContentW = Math.max(logoH + Math.round(padH * 0.5) + brandWidth, urlWidth)
  const dividerX = logoX + leftContentW + 10

  // === 竖线分割 ===
  const dividerPad = Math.round(headerH * 0.18)
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = Math.max(0.5, Math.round(headerH * 0.02))
  ctx.beginPath()
  ctx.moveTo(dividerX, dividerPad)
  ctx.lineTo(dividerX, headerH - dividerPad)
  ctx.stroke()

  // === 右侧：作品名称（高度匹配左侧区域） ===
  const titleFontSize = Math.max(16, Math.round(headerH * 0.55))
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#1e293b'
  ctx.font = `700 ${titleFontSize}px 'PingFang SC', sans-serif`
  // 文字区域居中于左侧内容区（logo 到网址底部之间）
  const titleCenterY = logoY + (logoH + Math.round(headerH * 0.04) + urlFontSize) / 2
  ctx.fillText(designTitle.value || '拼豆图纸', dividerX + padH, titleCenterY)

  const startY = headerH

  // 3. 边框背景
  if (showBorder.value && bp > 0) {
    ctx.fillStyle = borderColor.value
    ctx.fillRect(0, startY, width - bp, bp)           // 上
    ctx.fillRect(0, startY + gh * cs, width, bp)      // 下
    ctx.fillRect(0, startY + bp, bp, gh * cs)         // 左
    ctx.fillRect(width - bp, startY + bp, bp, gh * cs) // 右
  }

  const gx = bp  // 网格起始 x
  const gy = startY + bp  // 网格起始 y

  // 4. 棋盘格背景
  const miniGrid = Math.max(4, Math.round(cs * 0.5))
  for (let r = 0; r * miniGrid < gh * cs; r++) {
    for (let c = 0; c * miniGrid < gw * cs; c++) {
      if ((r + c) % 2 === 0) {
        ctx.fillStyle = 'rgba(220,220,228,0.28)'
        ctx.fillRect(gx + c * miniGrid, gy + r * miniGrid, miniGrid, miniGrid)
      }
    }
  }

  // 5. 色块填充
  for (let r = 0; r < gh; r++) {
    for (let c = 0; c < gw; c++) {
      const idx = r * gw + c
      const colorId = gridData.value[idx]
      if (!colorId) continue
      const info = colorMap.value.get(colorId)
      if (info?.hex) {
        ctx.fillStyle = info.hex
        ctx.fillRect(gx + c * cs, gy + r * cs, cs, cs)
      }
    }
  }

  // 6. 细网格线
  if (showGrid.value && cs >= 4) {
    ctx.strokeStyle = hexToRgba(gridColor.value, gridOpacity.value)
    ctx.lineWidth = Math.max(0.5, cs * 0.025)
    ctx.beginPath()
    for (let c = 0; c <= gw; c++) {
      ctx.moveTo(gx + c * cs, gy)
      ctx.lineTo(gx + c * cs, gy + gh * cs)
    }
    for (let r = 0; r <= gh; r++) {
      ctx.moveTo(gx, gy + r * cs)
      ctx.lineTo(gx + gw * cs, gy + r * cs)
    }
    ctx.stroke()
  }

  // 7. 加粗网格线
  const bi = boldInterval.value
  if (bi > 0 && cs >= 4) {
    ctx.strokeStyle = hexToRgba(boldGridColor.value, boldGridOpacity.value)
    ctx.lineWidth = Math.max(1, cs * 0.08)
    ctx.beginPath()
    for (let c = bi; c < gw; c += bi) {
      ctx.moveTo(gx + c * cs, gy)
      ctx.lineTo(gx + c * cs, gy + gh * cs)
    }
    for (let r = bi; r < gh; r += bi) {
      ctx.moveTo(gx, gy + r * cs)
      ctx.lineTo(gx + gw * cs, gy + r * cs)
    }
    ctx.stroke()
  }

  // 8. 色号文字标注
  if (showColorLabel.value && cs >= 14) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let r = 0; r < gh; r++) {
      for (let c = 0; c < gw; c++) {
        const idx = r * gw + c
        const colorId = gridData.value[idx]
        if (!colorId) continue
        const info = colorMap.value.get(colorId)
        if (!info?.code) continue
        const code = info.code
        const fontSize = Math.max(7, Math.min(cs * 0.88 / (code.length * 0.62), cs * 0.42))
        ctx.font = `bold ${fontSize}px 'PingFang SC', 'Noto Sans SC', sans-serif`
        const cx = gx + c * cs + cs / 2
        const cy = gy + r * cs + cs / 2
        ctx.fillStyle = luminance(info.hex) > 0.4 ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)'
        ctx.fillText(code, cx, cy)
      }
    }
  }

  // 9. 边框行列号
  if (showBorder.value && bp > 0) {
    // 列号（上方+下方）
    const colFontSize = Math.max(6, Math.min(Math.floor(cs * 0.55), Math.floor(cs / (String(gw).length * 0.62))))
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = borderTextColor.value
    ctx.font = `700 ${colFontSize}px 'PingFang SC', monospace`
    const topY = startY + bp / 2
    const bottomY = startY + bp + gh * cs + bp / 2
    for (let c = 0; c < gw; c++) {
      const cx = gx + c * cs + cs / 2
      ctx.fillText(String(c + 1), cx, topY)
      ctx.fillText(String(c + 1), cx, bottomY)
    }

    // 行号（左侧+右侧）
    const rowFontSize = Math.max(6, Math.min(Math.floor(cs * 0.55), Math.floor(cs / (String(gh).length * 0.62))))
    ctx.font = `700 ${rowFontSize}px 'PingFang SC', monospace`
    const leftX = bp / 2
    const rightX = bp + gw * cs + bp / 2
    for (let r = 0; r < gh; r++) {
      const cy = gy + r * cs + cs / 2
      ctx.fillText(String(r + 1), leftX, cy)
      ctx.fillText(String(r + 1), rightX, cy)
    }

    // 四角填色方块
    ctx.fillStyle = borderColor.value
    ctx.fillRect(0, startY, bp, bp)
    ctx.fillRect(bp + gw * cs, startY, bp, bp)
    ctx.fillRect(0, startY + bp + gh * cs, bp, bp)
    ctx.fillRect(bp + gw * cs, startY + bp + gh * cs, bp, bp)

    // 边框描边
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = Math.max(1, cs * 0.02)
    ctx.strokeRect(0, startY, bp + gw * cs + bp, bp + gh * cs + bp)
  }

  // 10. 水印
  if (watermarkText.value.trim()) {
    const fontSize = Math.max(10, Math.round(scale.value * 2.5))
    ctx.font = `600 ${fontSize}px 'PingFang SC', sans-serif`
    ctx.fillStyle = hexToRgba(watermarkColor.value, watermarkOpacity.value)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    const wmY = showBorder.value ? (startY + bp + gh * cs + bp + 20) : (gh * cs + 20)
    ctx.fillText(watermarkText.value, width / 2, wmY)
  }

  // 11. 用料清单（双色卡片横排）
  if (showBeadList.value && beadUsageList.value.length > 0) {
    const list = sortedBeadUsage.value
    const cardW = Math.max(108, Math.round(cs * 6.6))   // 卡片宽度 ×3
    const cardH = Math.max(132, Math.round(cs * 8.4))   // 卡片高度 ×3
    const topH = Math.round(cardH * 0.62)               // 上半色块高度
    const gap = Math.max(4, Math.round(cs * 0.25))      // 间距不变
    const listY = showBorder.value ? (startY + bp + gh * cs + bp + 56) : (gh * cs + 56)

    // 标题
    const titleSize = Math.round(cardH * 0.22)
    const blTitle = brandName.value ? `用料清单（${brandName.value}）` : '用料清单'
    ctx.fillStyle = '#475569'
    ctx.font = `700 ${titleSize}px 'PingFang SC', sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText(blTitle, 20, listY)

    // 弹性横排
    const itemsPerRow = Math.max(1, Math.floor((width - 40 + gap) / (cardW + gap)))
    const totalRowW = itemsPerRow * cardW + (itemsPerRow - 1) * gap
    const startX = 20 + (width - 40 - totalRowW) / 2  // 居中

    list.forEach((b, i) => {
      const col = i % itemsPerRow
      const row = Math.floor(i / itemsPerRow)
      const cx = startX + col * (cardW + gap)
      const cy = listY + 20 + row * (cardH + gap)

      // 卡片背景
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = Math.max(1, Math.round(cardW * 0.03))
      const radius = Math.round(cardW * 0.1)
      roundRect(ctx, cx, cy, cardW, cardH, radius)
      ctx.fill()
      ctx.stroke()

      // 上半：珠子颜色 + 色号
      ctx.fillStyle = b.hex
      roundRect(ctx, cx + 0.5, cy + 0.5, cardW - 1, topH, radius)
      ctx.fill()
      // 覆盖下半圆角，让过渡锐利
      ctx.fillStyle = b.hex
      ctx.fillRect(cx + 1, cy + topH - 3, cardW - 2, 6)

      const codeSize = Math.max(24, Math.round(cardW * 0.28))
      ctx.fillStyle = luminance(b.hex) > 0.4 ? '#1e293b' : '#ffffff'
      ctx.font = `700 ${codeSize}px 'PingFang SC', sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(b.code || b.name, cx + cardW / 2, cy + topH / 2)

      // 下半：白色底 + 数量
      const countSize = Math.max(22, Math.round(cardW * 0.24))
      ctx.fillStyle = '#64748b'
      ctx.font = `600 ${countSize}px 'PingFang SC', sans-serif`
      ctx.fillText(`×${b.count}`, cx + cardW / 2, cy + topH + (cardH - topH) / 2)
    })
  }
}

/** 渲染预览 Canvas */
function renderPreview() {
  if (!previewCanvasRef.value) return
  // 预览直接用完整渲染（包含标题栏、边框、用料清单等）
  const canvas = previewCanvasRef.value
  const fullW = canvasWidth.value
  const fullH = canvasHeight.value
  renderCanvas(canvas, fullW, fullH)
}

/** 带防抖的重绘 */
let renderTimer = null
function onConfigChange() {
  if (renderTimer) clearTimeout(renderTimer)
  renderTimer = setTimeout(() => {
    rendering.value = true
    nextTick(() => {
      renderPreview()
      rendering.value = false
    })
  }, 100)
}

// 配置变更时自动重绘
watch([
  scale, guideMode, customGuideInterval, gridColor, gridOpacity,
  boldGridColor, boldGridOpacity, showGrid, showColorLabel,
  showBorder, showBeadList, borderColor, borderTextColor,
  watermarkText, watermarkColor, watermarkOpacity, sortMode
], () => {
  onConfigChange()
}, { deep: false })

// ==================== 全屏缩放预览 ====================

const zooming = ref(false)
const zoomScale = ref(1)
const zoomPanX = ref(0)
const zoomPanY = ref(0)
const zoomBusy = ref(false)
const zoomCanvasRef = ref(null)

const zoomCanvasStyle = computed(() => ({
  transform: `translate(${zoomPanX.value}px,${zoomPanY.value}px) scale(${zoomScale.value})`,
}))

function openZoom() {
  if (!previewCanvasRef.value) return
  zooming.value = true
  zoomScale.value = 1
  zoomPanX.value = 0
  zoomPanY.value = 0
  nextTick(() => {
    if (zoomCanvasRef.value) {
      // 复制预览 canvas 内容
      const zCtx = zoomCanvasRef.value.getContext('2d')
      const srcCanvas = previewCanvasRef.value
      zoomCanvasRef.value.width = srcCanvas.width
      zoomCanvasRef.value.height = srcCanvas.height
      zCtx.drawImage(srcCanvas, 0, 0)
    }
  })
}

function onZoomWheel(e) {
  const delta = e.deltaY > 0 ? -0.2 : 0.2
  zoomScale.value = Math.max(0.5, Math.min(8, zoomScale.value + delta))
}

// 触摸缩放
let zoomPinchStart = null
function onZoomTouchStart(e) {
  if (e.touches.length === 2) {
    zoomPinchStart = {
      dist: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY),
      scale: zoomScale.value,
    }
  }
}
function onZoomTouchMove(e) {
  if (zoomPinchStart && e.touches.length === 2) {
    const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
    zoomScale.value = Math.max(0.5, Math.min(8, zoomPinchStart.scale * (dist / zoomPinchStart.dist)))
  }
}
function onZoomTouchEnd() { zoomPinchStart = null }

// 鼠标拖拽
let zoomDragging = false, zoomLast = null
function onZoomMouseDown(e) { zoomDragging = true; zoomLast = { x: e.clientX, y: e.clientY } }
function onZoomMouseMove(e) {
  if (!zoomDragging || !zoomLast) return
  zoomPanX.value += e.clientX - zoomLast.x
  zoomPanY.value += e.clientY - zoomLast.y
  zoomLast = { x: e.clientX, y: e.clientY }
}
function onZoomMouseUp() { zoomDragging = false; zoomLast = null }

// ==================== 下载与分享 ====================

const canShare = computed(() => {
  return typeof navigator !== 'undefined' && navigator.canShare && navigator.share
})

async function downloadPNG() {
  if (!previewCanvasRef.value) return
  exporting.value = true
  try {
    const blob = await new Promise((resolve) => {
      previewCanvasRef.value.toBlob((b) => resolve(b), 'image/png', 1)
    })
    if (!blob) throw new Error('导出失败')

    // iOS: 尝试分享
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream && navigator.canShare) {
      const file = new File([blob], `${designTitle.value}.png`, { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] })
        exporting.value = false
        return
      }
    }

    // 桌面端：直接下载
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.download = `${designTitle.value}.png`
    a.href = url
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (e) {
    console.error('[Export] 下载失败:', e)
  }
  exporting.value = false
}

async function shareImage() {
  if (!previewCanvasRef.value) return
  try {
    const blob = await new Promise((resolve) => {
      previewCanvasRef.value.toBlob((b) => resolve(b), 'image/png', 1)
    })
    if (!blob) return
    const file = new File([blob], `${designTitle.value}.png`, { type: 'image/png' })
    await navigator.share({ files: [file] })
  } catch (e) {
    if (e?.name !== 'AbortError') console.error('[Export] 分享失败:', e)
  }
}

// ==================== 移动端检测 ====================

const isMobile = ref(window.innerWidth < 768)
function onResize() { isMobile.value = window.innerWidth < 768 }

// ==================== 生命周期 ====================

onMounted(() => {
  loadCanvasData()
  // 预加载品牌 logo 图片
  const img = new Image()
  img.onload = () => { brandLogoImage.value = img; renderPreview() }
  img.src = '/logo-brand.png'
  window.addEventListener('resize', onResize)
  nextTick(() => {
    renderPreview()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (renderTimer) clearTimeout(renderTimer)
})
</script>
