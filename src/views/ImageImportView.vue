<!-- ============================================
  ImageImportView.vue — 图片导入转拼豆图纸
  布局：顶部导航 + 图片预览区 + 参数设置
============================================ -->
<template>
  <div class="fixed inset-0 flex flex-col bg-slate-50 text-slate-900 overflow-hidden select-none z-50">

    <!-- 顶部导航 -->
    <header class="h-14 bg-white border-b border-slate-200 flex items-center px-4 flex-shrink-0">
      <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        @click="$router.back()">
        <ArrowLeftIcon :size="20" class="text-slate-600" />
      </button>
      <span class="flex-1 text-center text-[15px] font-semibold text-slate-800">图片导入</span>
      <div class="w-8" />
    </header>

    <!-- 主内容 -->
    <div v-if="!imageSrc" class="flex-1 flex flex-col items-center justify-center p-8 gap-6">
      <!-- 上传区 -->
      <label class="cursor-pointer flex flex-col items-center text-center px-10 py-16 gap-5
                    border-2 border-dashed border-slate-200 rounded-3xl hover:border-primary/40
                    hover:bg-blue-50/30 transition-all max-w-xl w-full">
        <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <UploadIcon :size="28" class="text-primary" />
        </div>
        <div class="space-y-1.5">
          <h2 class="text-xl font-bold text-slate-800">点击上传图片</h2>
          <p class="text-sm text-slate-400">支持 JPG、PNG、WebP 格式</p>
        </div>
        <input type="file" accept="image/*" class="hidden" @change="onFileSelect" />
      </label>

      <!-- 提示 -->
      <div class="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl max-w-xl">
        <AlertCircleIcon :size="16" class="text-amber-500 flex-shrink-0 mt-0.5" />
        <span class="text-xs text-amber-700 leading-relaxed">
          上传图片后将自动匹配最近珠子颜色，建议使用清晰、色彩分明的图片以获得最佳效果
        </span>
      </div>
    </div>

    <!-- 已上传图片：预览 + 设置 -->
    <div v-else class="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
      <!-- 图片预览区 -->
      <div class="flex-1 bg-slate-100 flex items-center justify-center overflow-hidden relative">
        <div class="relative shadow-2xl bg-white" :style="previewStyle">
          <img ref="previewImg" :src="imageSrc"
            class="block max-w-full max-h-full select-none"
            :style="imgTransform"
            draggable="false"
            @load="onImageLoad" />
          <!-- 裁剪框 -->
          <div v-if="imgLoaded" class="absolute border-2 border-primary pointer-events-none"
            :style="cropStyle">
            <!-- 网格线 -->
            <div class="absolute inset-0">
              <div class="absolute top-1/3 left-0 right-0 border-t border-white/20" />
              <div class="absolute top-2/3 left-0 right-0 border-t border-white/20" />
              <div class="absolute left-1/3 top-0 bottom-0 border-l border-white/20" />
              <div class="absolute left-2/3 top-0 bottom-0 border-l border-white/20" />
            </div>
            <!-- 四角手柄 -->
            <div v-for="h in handles" :key="h.cursor" class="absolute w-2.5 h-2.5 bg-white border-2 border-primary rounded-sm
              -translate-x-1/2 -translate-y-1/2 shadow-sm"
              :style="{ left: h.left, top: h.top, cursor: h.cursor }"
              @pointerdown.stop="startResize($event, h.handle)" />
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="generating" class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3
                        bg-white/80 backdrop-blur-md">
          <LoaderIcon :size="32" class="animate-spin text-primary" />
          <p class="text-xs font-bold text-slate-500">正在生成拼豆图纸...</p>
        </div>
      </div>

      <!-- 右侧设置面板 -->
      <div class="h-[45vh] lg:h-auto lg:w-[380px] bg-white border-t lg:border-t-0 lg:border-l
                  border-slate-100 flex flex-col flex-shrink-0 overflow-hidden">
        <!-- 设置内容 -->
        <div class="flex-1 overflow-y-auto p-4 space-y-5">
          <!-- 目标尺寸 -->
          <section>
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">目标尺寸</h3>
            <div class="flex items-center gap-3">
              <div class="flex-1 space-y-1">
                <label class="text-[10px] text-slate-400">宽度</label>
                <input v-model.number="targetW" type="number" min="10" max="200"
                  class="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm text-center
                         focus:border-primary focus:ring-1 focus:ring-primary/20" />
              </div>
              <span class="text-slate-300 mt-4">×</span>
              <div class="flex-1 space-y-1">
                <label class="text-[10px] text-slate-400">高度</label>
                <input v-model.number="targetH" type="number" min="10" max="200"
                  class="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm text-center
                         focus:border-primary focus:ring-1 focus:ring-primary/20" />
              </div>
            </div>
          </section>

          <!-- 珠子品牌（仅色卡模式显示） -->
          <section v-if="!rawMode">
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">珠子品牌</h3>
            <div class="flex flex-wrap gap-1.5">
              <button v-for="b in beadBrands" :key="b"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                :class="brand === b ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
                @click="brand = b">{{ b }}</button>
            </div>
          </section>

          <!-- 色彩模式切换 -->
          <section>
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">色彩模式</h3>
            <div class="flex bg-slate-100 rounded-xl p-1 gap-0.5">
              <button
                class="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                :class="!rawMode ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                @click="rawMode = false">🎨 系统色卡</button>
              <button
                class="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                :class="rawMode ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                @click="rawMode = true">🖼️ 1:1 原色</button>
            </div>
            <p class="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
              {{ rawMode ? '保留图片原始色彩，不匹配任何珠子色卡' : '将图片颜色匹配到所选品牌的珠子色卡' }}
            </p>
          </section>

          <!-- Q 版风格选择 -->
          <section>
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              ✨ Q版风格 <span class="text-primary font-normal normal-case tracking-normal ml-1">— 可选</span>
            </h3>
            <div class="flex flex-wrap gap-1.5">
              <button
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                :class="!qStyle ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
                @click="qStyle = null">无（标准转换）</button>
              <button v-for="s in qStyles" :key="s.style_id"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative"
                :class="qStyle === s.style_id ? 'bg-primary/10 text-primary ring-1 ring-primary' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
                @click="selectQStyle(s)">
                {{ s.style_name }}
              </button>
            </div>
            <!-- 选中风格预览 -->
            <div v-if="selectedStyle" class="mt-2 p-2 bg-blue-50 rounded-lg text-[10px] text-slate-600 leading-relaxed space-y-1">
              <div class="flex items-center gap-2">
                <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-2xl shadow-sm">
                  {{ {q_big_head:'👶',cute_sticker:'🪄',simple_line:'🎨',pet_cute:'🐱',couple_double:'💑'}[selectedStyle.style_id] || '✨' }}
                </div>
                <div class="flex-1">
                  <span class="font-semibold text-primary">{{ selectedStyle.style_name }}</span>：{{ selectedStyle.description }}
                </div>
              </div>
              <div class="text-slate-400">{{ selectedStyle.recommend_size[0] }}×{{ selectedStyle.recommend_size[1] }} · {{ selectedStyle.difficulty }} · 约{{ selectedStyle.estimate_beads }}颗 · {{ selectedStyle.tags.join('、') }}</div>
            </div>
          </section>

          <!-- 预览效果 -->
          <section v-if="gridPreview.length">
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">预览</h3>
            <div class="bg-slate-100 rounded-xl p-3 flex items-center justify-center">
              <canvas ref="previewCanvas" class="max-w-full max-h-[160px] rounded-lg pixel-thumb shadow-sm" />
            </div>
            <p class="text-[10px] text-slate-400 mt-1.5 text-center">
              {{ targetW }}×{{ targetH }} · {{ colorCount }}色
            </p>
          </section>
        </div>

        <!-- 生成按钮 -->
        <div class="p-4 border-t border-slate-100">
          <button
            class="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm
                   hover:bg-primary-dark active:scale-[0.98] transition-all
                   disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :disabled="!imgLoaded || generating"
            @click="generate">
            <LoaderIcon v-if="generating" :size="16" class="animate-spin" />
            <WandIcon v-else :size="16" />
            {{ generating ? '生成中...' : '开始生成图纸' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon, UploadIcon, AlertCircleIcon, LoaderIcon, WandIcon }
  from 'lucide-vue-next'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'

const router = useRouter()
const auth = useAuth()
const toast = useToast()

// 图片
const imageSrc = ref('')
const originalFile = ref(null)  // 保留原始 File 对象，直接上传给后端
const previewImg = ref(null)
const imgLoaded = ref(false)
const imgNaturalW = ref(0), imgNaturalH = ref(0)

// 裁剪
const cropX = ref(0), cropY = ref(0), cropW = ref(0), cropH = ref(0)

// 缩放旋转
const scale = ref(1), rotation = ref(0)

// Q版风格
const qStyle = ref(null)
const qStyles = ref([])
const selectedStyle = computed(() => qStyles.value.find(s => s.style_id === qStyle.value) || null)

// 参数
const targetW = ref(58), targetH = ref(58)
const brand = ref('全部')
const rawMode = ref(false)  // 1:1 原色还原模式
const beadBrands = ref([])
const allColors = ref([])

// 生成
const generating = ref(false)
const gridPreview = ref([])
const gridResult = ref(null)
const colorCount = ref(0)
const previewCanvas = ref(null)

const cropStyle = computed(() => ({
  left: cropX.value + 'px', top: cropY.value + 'px',
  width: cropW.value + 'px', height: cropH.value + 'px'
}))

const imgTransform = computed(() => ({
  transform: `scale(${scale.value}) rotate(${rotation.value}deg)`,
  transformOrigin: 'center center'
}))

const previewStyle = computed(() => {
  if (!imgLoaded.value) return {}
  return {
    width: (imgNaturalW.value * scale.value) + 'px',
    height: (imgNaturalH.value * scale.value) + 'px'
  }
})

const handles = computed(() => {
  if (!cropW.value) return []
  return [
    { handle: 'nw', left: '0%', top: '0%', cursor: 'nwse-resize' },
    { handle: 'ne', left: '100%', top: '0%', cursor: 'nesw-resize' },
    { handle: 'sw', left: '0%', top: '100%', cursor: 'nesw-resize' },
    { handle: 'se', left: '100%', top: '100%', cursor: 'nwse-resize' },
  ]
})

// Q版风格
function selectQStyle(s) {
  qStyle.value = s.style_id
  targetW.value = s.recommend_size[0]
  targetH.value = s.recommend_size[1]
}

async function loadQStyles() {
  try {
    const res = await API.get('/api/image/qstyles', false)
    if (res.code === 200) qStyles.value = res.data || []
  } catch (_) {}
}

onMounted(async () => {
  loadQStyles()
  try {
    const res = await API.get('/api/beads/colors', false)
    allColors.value = res.data || []
    beadBrands.value = [...new Set(allColors.value.map(c => c.brand))]
  } catch { /* ignore */ }
})

function onFileSelect(e) {
  const file = e.target.files?.[0]; if (!file) return
  originalFile.value = file  // 保留原始文件，后端处理裁剪/缩放
  const reader = new FileReader()
  reader.onload = ev => { imageSrc.value = ev.target.result }
  reader.readAsDataURL(file)
}

function onImageLoad() {
  const img = previewImg.value; if (!img) return
  imgNaturalW.value = img.naturalWidth
  imgNaturalH.value = img.naturalHeight
  const s = Math.min(1, 500 / Math.max(img.naturalWidth, img.naturalHeight))
  scale.value = s

  // 初始裁剪区域：居中正方形
  const size = Math.min(img.naturalWidth, img.naturalHeight) * 0.8 * s
  cropW.value = size; cropH.value = size
  cropX.value = (img.naturalWidth * s - size) / 2
  cropY.value = (img.naturalHeight * s - size) / 2
  imgLoaded.value = true

  nextTick(updatePreview)
}

function updatePreview() {
  if (!imgLoaded.value) return
  // 简化预览：随机生成颜色块作为预览效果
  const colors = allColors.value.filter(c => c.brand === brand.value)
  if (!colors.length) return
  const preview = []
  const w = Math.min(targetW.value, 20), h = Math.min(targetH.value, 20)
  for (let r = 0; r < h; r++) {
    const row = []
    for (let c = 0; c < w; c++) {
      row.push(colors[Math.floor(Math.random() * colors.length)])
    }
    preview.push(row)
  }
  gridPreview.value = preview
  colorCount.value = new Set(preview.flat().map(c => c.hex)).size
  renderPreviewCanvas(preview, w, h)
}

function renderPreviewCanvas(grid, w, h) {
  const canvas = previewCanvas.value; if (!canvas) return
  const size = Math.min(160, w * 4)
  canvas.width = w; canvas.height = h
  canvas.style.width = size + 'px'; canvas.style.height = (size * h / w) + 'px'
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(w, h)
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const cell = grid[r]?.[c]; if (!cell?.hex) continue
      const idx = (r * w + c) * 4
      const hex = cell.hex.replace('#', '')
      img.data[idx] = parseInt(hex.substring(0, 2), 16)
      img.data[idx + 1] = parseInt(hex.substring(2, 4), 16)
      img.data[idx + 2] = parseInt(hex.substring(4, 6), 16)
      img.data[idx + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}

// 简单的裁剪调整
let resizeHandle = null
function startResize(e, handle) {
  e.preventDefault(); e.stopPropagation()
  resizeHandle = { handle, startX: e.clientX, startY: e.clientY, cx: cropX.value, cy: cropY.value, cw: cropW.value, ch: cropH.value }
  document.addEventListener('pointermove', onResizeMove)
  document.addEventListener('pointerup', onResizeEnd)
}

function onResizeMove(e) {
  if (!resizeHandle) return
  const dx = e.clientX - resizeHandle.startX, dy = e.clientY - resizeHandle.startY
  const { handle, cx, cy, cw, ch } = resizeHandle
  if (handle.includes('e')) cropW.value = Math.max(20, cw + dx)
  if (handle.includes('w')) { cropX.value = cx + dx; cropW.value = Math.max(20, cw - dx) }
  if (handle.includes('s')) cropH.value = Math.max(20, ch + dy)
  if (handle.includes('n')) { cropY.value = cy + dy; cropH.value = Math.max(20, ch - dy) }
  updatePreview()
}

function onResizeEnd() {
  resizeHandle = null
  document.removeEventListener('pointermove', onResizeMove)
  document.removeEventListener('pointerup', onResizeEnd)
}

// 生成图纸 — 上传原始文件 + 裁剪参数，后端完成全部图片处理
// 管道：引导滤波 → Sharp 缩放 → Lab 色彩量化 + Floyd-Steinberg 抖动 → 珠子匹配
async function generate() {
  if (!originalFile.value || !imgLoaded.value) return
  generating.value = true
  try {
    const sx = Math.round(cropX.value / scale.value)
    const sy = Math.round(cropY.value / scale.value)
    const sw = Math.round(cropW.value / scale.value)
    const sh = Math.round(cropH.value / scale.value)

    if (sw <= 0 || sh <= 0) {
      toast.show('请先调整裁剪区域'); generating.value = false; return
    }

    const form = new FormData()
    form.append('file', originalFile.value)
    form.append('targetWidth', String(targetW.value))
    form.append('targetHeight', String(targetH.value))
    form.append('cropX', String(sx))
    form.append('cropY', String(sy))
    form.append('cropW', String(sw))
    form.append('cropH', String(sh))
    form.append('brand', brand.value)
    if (rawMode.value) form.append('raw', 'true')
    if (qStyle.value) form.append('qStyle', qStyle.value)

    const res = await API.upload('/api/image-to-grid', form, auth.isLoggedIn.value)
    if (res.code === 200) {
      gridResult.value = res.data
      sessionStorage.setItem('imported_grid', JSON.stringify(res.data))
      router.replace('/editor')
      nextTick(() => toast.show('图片已转换为拼豆图纸！'))
    } else {
      toast.show('转换失败: ' + (res.message || '请重试'))
    }
  } catch (e) {
    toast.show('生成失败: ' + (e.message || '请重试'))
  } finally {
    generating.value = false
  }
}
</script>

<style scoped>
.pixel-thumb {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
