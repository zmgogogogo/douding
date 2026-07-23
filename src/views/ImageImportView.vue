<!-- ============================================
  ImageImportView.vue — 图片导入转拼豆图纸
  布局：顶部导航 + 图片预览区 + 参数设置
============================================ -->
<template>
  <div
    class="fixed inset-0 flex flex-col bg-slate-50 text-slate-900 overflow-hidden select-none z-50"
  >
    <!-- 顶部导航 -->
    <header class="h-14 bg-white border-b border-slate-200 flex items-center px-4 flex-shrink-0">
      <button
        class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        @click="$router.back()"
      >
        <ArrowLeftIcon :size="20" class="text-slate-600" />
      </button>
      <span class="flex-1 text-center text-[15px] font-semibold text-slate-800">图片导入</span>
      <div class="w-8" />
    </header>

    <!-- 主内容 -->
    <div v-if="!imageSrc" class="flex-1 flex flex-col items-center justify-center p-8 gap-6">
      <!-- 上传区 -->
      <label
        class="cursor-pointer flex flex-col items-center text-center px-10 py-16 gap-5 border-2 border-dashed border-slate-200 rounded-3xl hover:border-primary/40 hover:bg-blue-50/30 transition-all max-w-xl w-full relative"
      >
        <div
          class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center pointer-events-none"
        >
          <UploadIcon :size="28" class="text-primary" />
        </div>
        <div class="space-y-1.5 pointer-events-none">
          <h2 class="text-xl font-bold text-slate-800">点击上传图片</h2>
          <p class="text-sm text-slate-400">支持 JPG、PNG、WebP 格式</p>
        </div>
        <input
          type="file"
          accept="image/*"
          class="absolute inset-0 opacity-0 cursor-pointer z-10"
          @change="onFileSelect"
        />
      </label>

      <!-- 提示 -->
      <div
        class="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl max-w-xl"
      >
        <AlertCircleIcon :size="16" class="text-amber-500 flex-shrink-0 mt-0.5" />
        <span class="text-xs text-amber-700 leading-relaxed">
          上传图片后将自动匹配最近珠子颜色，建议使用清晰、色彩分明的图片以获得最佳效果
        </span>
      </div>
    </div>

    <!-- 已上传图片：预览 + 设置 -->
    <div v-else class="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
      <!-- 图片预览区 -->
      <div
        class="flex-1 bg-slate-100 flex items-center justify-center overflow-hidden relative"
        :class="imgLoaded && !isPanning && 'cursor-grab'"
        :style="imgLoaded && isPanning ? { cursor: 'grabbing' } : {}"
        @wheel.prevent="onImgWheel"
        @pointerdown="onImgBgPointerDown"
      >
        <!-- 操作提示 -->
        <div
          v-if="imgLoaded"
          class="absolute top-3 left-3 z-10 text-[10px] text-slate-400 bg-white/80 backdrop-blur rounded-lg px-2 py-1 pointer-events-none"
        >
          滚轮缩放 · 拖拽平移 · 拖动裁剪框
        </div>
        <div class="relative shadow-2xl bg-white" :style="previewStyle">
          <img
            ref="previewImg"
            :src="imageSrc"
            class="block select-none"
            :style="imgTransform"
            draggable="false"
            @load="onImageLoad"
          />
          <!-- 裁剪框（随缩放联动） -->
          <div
            v-if="imgLoaded"
            class="absolute border-2 border-primary cursor-move"
            :style="{ ...cropStyle, transform: `scale(${imgZoom})`, transformOrigin: '0 0' }"
            @pointerdown.stop="cropCtrl.startDrag($event)"
          >
            <!-- 九宫格参考线 -->
            <div class="absolute inset-0 pointer-events-none">
              <div class="absolute top-1/3 left-0 right-0 border-t border-white/40" />
              <div class="absolute top-2/3 left-0 right-0 border-t border-white/40" />
              <div class="absolute left-1/3 top-0 bottom-0 border-l border-white/40" />
              <div class="absolute left-2/3 top-0 bottom-0 border-l border-white/40" />
            </div>
            <!-- 四角缩放手柄 -->
            <div
              v-for="h in cropCtrl.handles.value"
              :key="h.cursor"
              class="absolute w-3 h-3 bg-white border-2 border-primary rounded-sm -translate-x-1/2 -translate-y-1/2 shadow-sm"
              :style="{ left: h.left, top: h.top, cursor: h.cursor }"
              @pointerdown.stop="cropCtrl.startResize($event, h.handle)"
            />
          </div>
        </div>

        <!-- 缩放控件 -->
        <div
          v-if="imgLoaded"
          class="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-white/90 backdrop-blur rounded-full shadow-md border border-slate-200 px-2 py-1"
        >
          <button
            class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold hover:bg-slate-200 transition-colors"
            @click="zoomOut"
          >
            −
          </button>
          <span class="text-[10px] font-mono w-10 text-center text-slate-600"
            >{{ Math.round(imgZoom * 100) }}%</span
          >
          <button
            class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold hover:bg-slate-200 transition-colors"
            @click="zoomIn"
          >
            +
          </button>
          <button
            class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] hover:bg-slate-200 transition-colors ml-1"
            @click="zoomReset"
            title="重置"
          >
            ↺
          </button>
        </div>

        <!-- 加载中 -->
        <div
          v-if="generating"
          class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-md"
        >
          <LoaderIcon :size="32" class="animate-spin text-primary" />
          <p class="text-xs font-bold text-slate-500">正在生成拼豆图纸...</p>
        </div>
      </div>

      <!-- 右侧设置面板 -->
      <div
        class="h-[45vh] lg:h-auto lg:w-[380px] bg-white border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col flex-shrink-0 overflow-hidden"
      >
        <!-- 设置内容 -->
        <div class="flex-1 overflow-y-auto p-4 space-y-5">
          <!-- 目标尺寸 -->
          <section>
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              目标尺寸
            </h3>
            <!-- 预设尺寸快捷按钮 -->
            <div class="flex gap-1.5 mb-3">
              <button
                v-for="ps in presetSizes"
                :key="ps"
                class="flex-1 h-7 rounded-lg text-[10px] font-medium transition-colors"
                :class="
                  targetW === ps && targetH === ps
                    ? 'bg-primary/10 text-primary ring-1 ring-primary'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                "
                @click="
                  targetW = ps
                  targetH = ps
                "
              >
                {{ ps }}px
              </button>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex-1 space-y-1">
                <label class="text-[10px] text-slate-400">宽度</label>
                <input
                  v-model.number="targetW"
                  type="number"
                  min="10"
                  max="200"
                  class="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm text-center focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <span class="text-slate-300 mt-4">×</span>
              <div class="flex-1 space-y-1">
                <label class="text-[10px] text-slate-400">高度</label>
                <input
                  v-model.number="targetH"
                  type="number"
                  min="10"
                  max="200"
                  class="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm text-center focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>
            <!-- 颜色总数滑块 -->
            <div class="mt-3 space-y-1.5">
              <div class="flex justify-between text-[10px] text-slate-400">
                <span>颜色总数</span
                ><span class="font-mono text-slate-600">{{ colorLimit }} 色</span>
              </div>
              <input
                v-model.number="colorLimit"
                type="range"
                min="4"
                max="32"
                class="w-full h-1.5 rounded-full appearance-none bg-slate-200 accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm"
              />
            </div>
          </section>

          <!-- 珠子品牌 -->
          <section>
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              珠子品牌
            </h3>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="b in beadBrands"
                :key="b"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                :class="
                  brand === b
                    ? 'bg-primary/10 text-primary'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                "
                @click="brand = b"
              >
                {{ b }}
              </button>
            </div>
          </section>

          <!-- 🔧 杂点去除 -->
          <section>
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              🔧 后处理
            </h3>
            <div class="space-y-3">
              <div class="space-y-1">
                <div class="flex justify-between text-[10px] text-slate-400">
                  <span>杂点去除</span
                  ><span>{{ ['关闭', '轻度', '中度', '强力'][denoiseLevel] }}</span>
                </div>
                <div class="flex gap-1">
                  <button
                    v-for="(lbl, i) in ['关', '轻', '中', '强']"
                    :key="i"
                    class="flex-1 h-6 rounded-lg text-[10px] font-medium transition-colors"
                    :class="
                      denoiseLevel === i
                        ? 'bg-primary/10 text-primary'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    "
                    @click="denoiseLevel = i"
                  >
                    {{ lbl }}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- 豆仓限定模式 -->
          <section>
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              📦 豆仓限定
              <span class="text-primary font-normal normal-case tracking-normal ml-1"
                >— 仅用已有豆色</span
              >
            </h3>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="warehouseLimited"
                type="checkbox"
                class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span class="text-xs text-slate-600">仅使用我豆仓内的颜色生成图纸</span>
            </label>
            <p v-if="warehouseLimited" class="text-[10px] text-slate-400 mt-1">
              开启后，转图结果仅使用你库存中已有的珠子颜色，无需补豆即可制作
            </p>
          </section>

          <!-- Q 版风格选择 -->
          <section>
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              ✨ Q版风格
              <span class="text-primary font-normal normal-case tracking-normal ml-1">— 可选</span>
            </h3>
            <div class="flex flex-wrap gap-1.5">
              <button
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                :class="
                  !qStyle
                    ? 'bg-primary/10 text-primary'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                "
                @click="qStyle = null"
              >
                无（标准转换）
              </button>
              <button
                v-for="s in qStyles"
                :key="s.style_id"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative"
                :class="
                  qStyle === s.style_id
                    ? 'bg-primary/10 text-primary ring-1 ring-primary'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                "
                @click="selectQStyle(s)"
              >
                {{ s.style_name }}
              </button>
            </div>
            <!-- 选中风格预览 -->
            <div
              v-if="selectedStyle"
              class="mt-2 p-2 bg-blue-50 rounded-lg text-[10px] text-slate-600 leading-relaxed space-y-1"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-2xl shadow-sm"
                >
                  {{
                    {
                      q_big_head: '👶',
                      cute_sticker: '🪄',
                      simple_line: '🎨',
                      pet_cute: '🐱',
                      couple_double: '💑',
                    }[selectedStyle.style_id] || '✨'
                  }}
                </div>
                <div class="flex-1">
                  <span class="font-semibold text-primary">{{ selectedStyle.style_name }}</span
                  >：{{ selectedStyle.description }}
                </div>
              </div>
              <div class="text-slate-400">
                {{ selectedStyle.recommend_size[0] }}×{{ selectedStyle.recommend_size[1] }} ·
                {{ selectedStyle.difficulty }} · 约{{ selectedStyle.estimate_beads }}颗 ·
                {{ selectedStyle.tags.join('、') }}
              </div>
            </div>
          </section>

          <!-- 预览效果：原图 / 效果图 对比 -->
          <section v-if="gridPreview.length">
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              预览
              <span class="text-primary font-normal normal-case tracking-normal ml-1"
                >— 效果对比</span
              >
            </h3>
            <div class="grid grid-cols-2 gap-2">
              <!-- 原图 -->
              <div class="bg-slate-100 rounded-xl p-2 flex flex-col items-center gap-1">
                <span class="text-[9px] text-slate-400">原图</span>
                <canvas
                  ref="previewOrigCanvas"
                  class="max-w-full max-h-[100px] rounded-lg shadow-sm"
                  style="image-rendering: auto"
                />
              </div>
              <!-- 效果图 -->
              <div class="bg-slate-100 rounded-xl p-2 flex flex-col items-center gap-1">
                <span class="text-[9px] text-slate-400">效果图</span>
                <canvas
                  ref="previewCanvas"
                  class="max-w-full max-h-[100px] rounded-lg pixel-thumb shadow-sm"
                />
              </div>
            </div>
            <div class="flex items-center justify-between mt-1.5">
              <p class="text-[10px] text-slate-400">
                {{ targetW }}×{{ targetH }} · {{ colorCount }}色
              </p>
              <label class="flex items-center gap-1 cursor-pointer">
                <input
                  v-model="showGridPreview"
                  type="checkbox"
                  class="w-3 h-3 rounded border-slate-300 text-primary"
                />
                <span class="text-[9px] text-slate-400">网格</span>
              </label>
            </div>
          </section>
        </div>

        <!-- 生成按钮 -->
        <div class="p-4 border-t border-slate-100">
          <button
            class="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :disabled="!imgLoaded || generating"
            @click="generate"
          >
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
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon, UploadIcon, AlertCircleIcon, LoaderIcon, WandIcon } from 'lucide-vue-next'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'
import { useImageCrop } from '@/composables/useImageCrop.js'

// ============================================
//  前端轻量 Oklab 颜色匹配（与后端量化服务保持一致）
// ============================================
function srgbToLinear(v) {
  v /= 255
  return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92
}
function rgbToOklab(r, g, b) {
  const lr = srgbToLinear(r),
    lg = srgbToLinear(g),
    lb = srgbToLinear(b)
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  const l_ = Math.cbrt(l),
    m_ = Math.cbrt(m),
    s_ = Math.cbrt(s)
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  }
}
function oklabDist(l1, l2) {
  const dL = (l1.L - l2.L) * 2 // L 通道 2× 权重：亮度正确 > 色度正确
  const da = l1.a - l2.a,
    db = l1.b - l2.b
  return Math.sqrt(dL * dL + da * da + db * db)
}

const router = useRouter()
const auth = useAuth()
const toast = useToast()

// 裁剪交互（拖拽移动 + 四角缩放）
const cropCtrl = useImageCrop()

// 图片
const imageSrc = ref('')
const originalFile = ref(null) // 保留原始 File 对象，直接上传给后端
const previewImg = ref(null)
const imgLoaded = ref(false)
const imgNaturalW = ref(0),
  imgNaturalH = ref(0)

// 图片缩放与平移
const fitScale = ref(1) // 适配容器的基础缩放
const imgZoom = ref(1) // 用户放大倍数
const imgPanX = ref(0) // 平移 X（px）
const imgPanY = ref(0) // 平移 Y（px）
const isPanning = ref(false)
const panStart = ref(null)

function zoomIn() {
  imgZoom.value = Math.min(5, imgZoom.value * 1.3)
}
function zoomOut() {
  imgZoom.value = Math.max(0.2, imgZoom.value / 1.3)
}
function zoomReset() {
  imgZoom.value = 1
  imgPanX.value = 0
  imgPanY.value = 0
}

function onImgWheel(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const cx = e.clientX - rect.left // 光标相对容器位置
  const cy = e.clientY - rect.top
  const oldZoom = imgZoom.value
  const delta = e.deltaY < 0 ? 1.15 : 0.87
  const newZoom = Math.max(0.2, Math.min(5, oldZoom * delta))

  // 以光标为中心缩放：调整 pan 使光标下的点保持不变
  const scaleChange = newZoom / oldZoom
  imgPanX.value = cx - scaleChange * (cx - imgPanX.value)
  imgPanY.value = cy - scaleChange * (cy - imgPanY.value)
  imgZoom.value = newZoom
}

function onImgBgPointerDown(e) {
  // 裁剪框及其手柄不触发平移
  if (e.target.closest('.border-primary')) return
  if (e.target.closest('button')) return
  isPanning.value = true
  panStart.value = { x: e.clientX - imgPanX.value, y: e.clientY - imgPanY.value }
  document.addEventListener('pointermove', onPanMove)
  document.addEventListener('pointerup', onPanEnd)
}

function onPanMove(e) {
  if (!panStart.value) return
  imgPanX.value = e.clientX - panStart.value.x
  imgPanY.value = e.clientY - panStart.value.y
}

function onPanEnd() {
  isPanning.value = false
  panStart.value = null
  document.removeEventListener('pointermove', onPanMove)
  document.removeEventListener('pointerup', onPanEnd)
}

// Q版风格
const qStyle = ref(null)
const qStyles = ref([])
const selectedStyle = computed(() => qStyles.value.find((s) => s.style_id === qStyle.value) || null)

// 参数
const targetW = ref(58),
  targetH = ref(58)
const brand = ref('全部')
const warehouseLimited = ref(false)
const beadBrands = ref([])
const allColors = ref([])

// 生成
const generating = ref(false)
const gridPreview = ref([])
const gridResult = ref(null)
const colorCount = ref(0)
const previewCanvas = ref(null)
const previewOrigCanvas = ref(null)
const showGridPreview = ref(false)

// 后处理参数
const denoiseLevel = ref(2) // 杂点去除: 0关/1轻/2中/3强
const colorLimit = ref(16) // 颜色总数 4-32
const presetSizes = [40, 80, 120, 200]

const cropStyle = computed(() => cropCtrl.cropStyle.value)
const handles = computed(() => cropCtrl.handles.value)

const imgTransform = computed(() => {
  const s = fitScale.value * imgZoom.value
  return {
    width: imgNaturalW.value * s + 'px',
    height: imgNaturalH.value * s + 'px',
    transform: `translate(${imgPanX.value}px, ${imgPanY.value}px)`,
    transformOrigin: '0 0',
  }
})

const previewStyle = computed(() => {
  if (!imgLoaded.value) return {}
  const s = fitScale.value * imgZoom.value
  return {
    width: imgNaturalW.value * s + 'px',
    height: imgNaturalH.value * s + 'px',
  }
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
    beadBrands.value = [...new Set(allColors.value.map((c) => c.brand))].sort()
  } catch {
    /* ignore */
  }
})

// 参数变更时实时更新预览
watch([brand, targetW, targetH, colorLimit, denoiseLevel], () => {
  updatePreview()
})

function onFileSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return
  console.log('📷 图片已选择:', file.name, (file.size / 1024).toFixed(1) + 'KB', file.type)
  originalFile.value = file // 保留原始文件，后端处理裁剪/缩放
  const reader = new FileReader()
  reader.onload = (ev) => {
    imageSrc.value = ev.target.result
  }
  reader.onerror = () => {
    console.error('❌ 文件读取失败')
    toast.show('文件读取失败，请重试')
  }
  reader.readAsDataURL(file)
  // 重置 value 允许重复选择同一文件
  e.target.value = ''
}

function onImageLoad() {
  const img = previewImg.value
  if (!img) return
  imgNaturalW.value = img.naturalWidth
  imgNaturalH.value = img.naturalHeight
  // 根据容器大小计算合适的显示比例（最大边占容器 70%）
  const container = img.closest('.flex-1')
  const maxW = (container?.clientWidth || 800) * 0.7
  const maxH = (container?.clientHeight || 600) * 0.7
  fitScale.value = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight)
  imgZoom.value = 1
  imgPanX.value = 0
  imgPanY.value = 0
  // 初始化裁剪区域（居中正方形，占图片短边 80%）
  cropCtrl.setImageSize(img.naturalWidth, img.naturalHeight, fitScale.value)
  cropCtrl.initCrop()
  imgLoaded.value = true
  nextTick(updatePreview)
}

function updatePreview() {
  if (!imgLoaded.value || !previewImg.value) return
  const img = previewImg.value
  const tw = targetW.value,
    th = targetH.value

  // ============================================
  //  Step 1: 最近邻下采样（对齐后端，禁用双线性插值）
  //  文档规范：只用 INTER_NEAREST，不产生过渡混色
  // ============================================
  const offscreen = document.createElement('canvas')
  offscreen.width = tw
  offscreen.height = th
  const octx = offscreen.getContext('2d')
  octx.imageSmoothingEnabled = false // 🔑 关键：禁用双线性插值 → 最近邻
  octx.drawImage(img, 0, 0, tw, th)
  const imgData = octx.getImageData(0, 0, tw, th)

  // 加载当前品牌的颜色库用于匹配
  const palette =
    brand.value === '全部'
      ? allColors.value
      : allColors.value.filter((c) => c.brand === brand.value)
  if (!palette.length) return

  // 预计算调色板所有颜色的 Oklab 值
  const paletteOklab = palette.map((bc) => {
    const hex = bc.hex.replace('#', '')
    const br = parseInt(hex.substring(0, 2), 16)
    const bg = parseInt(hex.substring(2, 4), 16)
    const bb = parseInt(hex.substring(4, 6), 16)
    return { ...bc, oklab: rgbToOklab(br, bg, bb) }
  })

  // ============================================
  //  Step 2: Oklab 感知距离匹配 + 颜色频率统计
  //  带 RGB→Bead 缓存：最近邻采样会重复采样相同颜色，缓存命中率极高
  // ============================================
  const matchCache = new Map() // 'r,g,b' → best bead color
  const grid = []
  const hexCount = new Map() // hex → count（用于后续颜色限制）
  for (let r = 0; r < th; r++) {
    const row = []
    for (let c = 0; c < tw; c++) {
      const i = (r * tw + c) * 4
      const pr = imgData.data[i],
        pg = imgData.data[i + 1],
        pb = imgData.data[i + 2],
        pa = imgData.data[i + 3]
      if (pa < 128) {
        row.push(null)
        continue
      }
      const cacheKey = `${pr},${pg},${pb}`
      let best = matchCache.get(cacheKey)
      if (!best) {
        const pixelOklab = rgbToOklab(pr, pg, pb)
        best = paletteOklab[0]
        let bestDist = Infinity
        for (const bc of paletteOklab) {
          const dist = oklabDist(pixelOklab, bc.oklab)
          if (dist < bestDist) {
            bestDist = dist
            best = bc
          }
        }
        matchCache.set(cacheKey, best)
      }
      row.push(best)
      hexCount.set(best.hex.toUpperCase(), (hexCount.get(best.hex.toUpperCase()) || 0) + 1)
    }
    grid.push(row)
  }

  // ============================================
  //  Step 3: 颜色限制（模拟后端 K-Means 效果）
  //  按频率排序，只保留 top-N 颜色（N = colorLimit）
  //  低频颜色重新映射到最近的高频颜色
  // ============================================
  const limit = Math.min(colorLimit.value, hexCount.size)
  if (hexCount.size > limit) {
    // 按频率降序排列颜色
    const sortedHexes = [...hexCount.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex)
    const keptHexes = new Set(sortedHexes.slice(0, limit))

    // 构建被保留颜色的 Oklab 查找表
    const keptColors = paletteOklab.filter((bc) => keptHexes.has(bc.hex.toUpperCase()))
    const discardedHexes = sortedHexes.slice(limit)

    // 为每个被丢弃的颜色找到最近的保留颜色
    const remapTable = new Map()
    for (const dHex of discardedHexes) {
      const dc = paletteOklab.find((bc) => bc.hex.toUpperCase() === dHex)
      if (!dc) continue
      let best = keptColors[0],
        bestDist = Infinity
      for (const kc of keptColors) {
        const dist = oklabDist(dc.oklab, kc.oklab)
        if (dist < bestDist) {
          bestDist = dist
          best = kc
        }
      }
      remapTable.set(dHex, best)
    }

    // 应用颜色重映射
    for (let r = 0; r < th; r++) {
      for (let c = 0; c < tw; c++) {
        const cell = grid[r][c]
        if (!cell) continue
        const hex = cell.hex.toUpperCase()
        if (!keptHexes.has(hex)) {
          grid[r][c] = remapTable.get(hex) || grid[r][c]
        }
      }
    }
  }

  // ============================================
  //  Step 4: 轻量后处理（模拟后端连通域过滤 + 杂点清除）
  //  清除孤立像素：如果某像素的8邻域全是不同颜色 → 替换为邻域主色
  // ============================================
  if (denoiseLevel.value >= 1) {
    const denoisePasses = denoiseLevel.value // 1~3 遍
    for (let pass = 0; pass < denoisePasses; pass++) {
      for (let r = 0; r < th; r++) {
        for (let c = 0; c < tw; c++) {
          const cell = grid[r][c]
          if (!cell) continue
          // 统计 8 邻域颜色
          const nb = new Map()
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue
              const nr = r + dy,
                nc = c + dx
              if (nr < 0 || nr >= th || nc < 0 || nc >= tw) continue
              const ncell = grid[nr][nc]
              if (!ncell) continue
              const key = ncell.hex.toUpperCase()
              nb.set(key, (nb.get(key) || 0) + 1)
            }
          }
          // 如果当前像素在邻域中占比 < 2（孤立点），替换为邻域主色
          const selfCount = nb.get(cell.hex.toUpperCase()) || 0
          if (selfCount < 2 && nb.size > 0) {
            let bestKey = null,
              bestCount = 0
            for (const [k, v] of nb) {
              if (v > bestCount) {
                bestCount = v
                bestKey = k
              }
            }
            // 找到该颜色的完整信息
            for (const bc of paletteOklab) {
              if (bc.hex.toUpperCase() === bestKey) {
                grid[r][c] = bc
                break
              }
            }
          }
        }
      }
    }
  }

  // 计算最终颜色数
  const finalHexes = new Set()
  for (const row of grid) {
    for (const cell of row) {
      if (cell?.hex) finalHexes.add(cell.hex.toUpperCase())
    }
  }

  gridPreview.value = grid
  colorCount.value = finalHexes.size
  renderPreviewCanvas(grid, tw, th)
  renderOrigPreview(img, tw, th)
}

function renderPreviewCanvas(grid, w, h) {
  const canvas = previewCanvas.value
  if (!canvas) return
  const size = Math.min(160, w * 4)
  canvas.width = w
  canvas.height = h
  canvas.style.width = size + 'px'
  canvas.style.height = (size * h) / w + 'px'
  const ctx = canvas.getContext('2d')
  const imgData = ctx.createImageData(w, h)
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const cell = grid[r]?.[c]
      if (!cell?.hex) continue
      const idx = (r * w + c) * 4
      const hex = cell.hex.replace('#', '')
      imgData.data[idx] = parseInt(hex.substring(0, 2), 16)
      imgData.data[idx + 1] = parseInt(hex.substring(2, 4), 16)
      imgData.data[idx + 2] = parseInt(hex.substring(4, 6), 16)
      imgData.data[idx + 3] = 255
    }
  }
  ctx.putImageData(imgData, 0, 0)
}

// 渲染原图缩略图用于对比
function renderOrigPreview(img, tw, th) {
  const canvas = previewOrigCanvas.value
  if (!canvas) return
  const size = Math.min(160, tw * 4)
  canvas.width = tw
  canvas.height = th
  canvas.style.width = size + 'px'
  canvas.style.height = (size * th) / tw + 'px'
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, tw, th)
}

// 生成图纸 — 上传原始文件 + 裁剪参数，后端完成全部图片处理
async function generate() {
  if (!originalFile.value || !imgLoaded.value) return
  generating.value = true
  try {
    const oc = cropCtrl.getOriginalCrop()
    if (oc.w <= 0 || oc.h <= 0) {
      toast.show('请先调整裁剪区域')
      generating.value = false
      return
    }

    const form = new FormData()
    form.append('file', originalFile.value)
    form.append('targetWidth', String(targetW.value))
    form.append('targetHeight', String(targetH.value))
    form.append('cropX', String(oc.x))
    form.append('cropY', String(oc.y))
    form.append('cropW', String(oc.w))
    form.append('cropH', String(oc.h))
    form.append('brand', brand.value)
    if (warehouseLimited.value) form.append('warehouseLimited', 'true')
    if (qStyle.value) form.append('qStyle', qStyle.value)

    // 后处理参数
    form.append('denoiseLevel', String(denoiseLevel.value))
    form.append('colorLimit', String(colorLimit.value))

    const res = await API.upload('/api/image-to-grid', form, auth.isLoggedIn.value)
    if (res.code === 200) {
      gridResult.value = res.data
      sessionStorage.setItem('imported_grid', JSON.stringify(res.data))
      sessionStorage.setItem('import_toast', '图片已转换为拼豆图纸！')
      router.replace('/editor')
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
