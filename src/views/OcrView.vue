<!-- ============================================
  OcrView.vue — OCR 识别图纸
  上传带色号标注的图纸照片 → OCR识别色号 → 生成网格
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
      <span class="flex-1 text-center text-[15px] font-semibold text-slate-800">OCR 识别图纸</span>
      <div class="w-8" />
    </header>

    <!-- 主内容 -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="!result" class="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <!-- 上传区 -->
        <div v-if="!imageSrc" class="space-y-4">
          <label
            class="cursor-pointer flex flex-col items-center text-center px-10 py-16 gap-5 border-2 border-dashed border-slate-200 rounded-3xl hover:border-primary/40 hover:bg-blue-50/30 transition-all"
          >
            <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ScanTextIcon :size="28" class="text-primary" />
            </div>
            <div class="space-y-1.5">
              <h2 class="text-xl font-bold text-slate-800">上传图纸照片</h2>
              <p class="text-sm text-slate-400">上传带色号标注的拼豆图纸，自动识别色号生成网格</p>
            </div>
            <input type="file" accept="image/*" class="hidden" @change="onFileSelect" />
          </label>

          <div
            class="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl"
          >
            <InfoIcon :size="16" class="text-blue-500 flex-shrink-0 mt-0.5" />
            <span class="text-xs text-blue-700 leading-relaxed">
              上传的图片需包含<b>清晰的网格线和色号标注</b>（如 H01、R05），
              系统会自动检测网格位置并识别每个格子的色号。
            </span>
          </div>
        </div>

        <!-- 图片预览 + 裁剪 -->
        <div v-else class="space-y-4">
          <div
            class="bg-slate-100 rounded-2xl p-4 flex items-center justify-center overflow-hidden relative"
          >
            <div
              class="relative"
              :style="{ width: imgDisplayW + 'px', height: imgDisplayH + 'px' }"
            >
              <img
                :src="imageSrc"
                class="block select-none"
                :style="{ width: imgDisplayW + 'px', height: imgDisplayH + 'px' }"
                draggable="false"
                @load="onOcrImageLoad"
              />
              <!-- 裁剪框 -->
              <div
                v-if="imgLoaded"
                class="absolute border-2 border-primary cursor-move"
                :style="cropCtrl.cropStyle.value"
                @pointerdown.stop="cropCtrl.startDrag($event)"
              >
                <div class="absolute inset-0 pointer-events-none">
                  <div class="absolute top-1/3 left-0 right-0 border-t border-white/40" />
                  <div class="absolute top-2/3 left-0 right-0 border-t border-white/40" />
                  <div class="absolute left-1/3 top-0 bottom-0 border-l border-white/40" />
                  <div class="absolute left-2/3 top-0 bottom-0 border-l border-white/40" />
                </div>
                <div
                  v-for="h in cropCtrl.handles.value"
                  :key="h.cursor"
                  class="absolute w-3 h-3 bg-white border-2 border-primary rounded-sm -translate-x-1/2 -translate-y-1/2 shadow-sm"
                  :style="{ left: h.left, top: h.top, cursor: h.cursor }"
                  @pointerdown.stop="cropCtrl.startResize($event, h.handle)"
                />
              </div>
            </div>
          </div>

          <!-- 参数设置 -->
          <div class="space-y-3">

            <div>
              <label class="text-[10px] font-bold uppercase text-slate-400">珠子品牌</label>
              <select
                v-model="brand"
                class="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm mt-1"
              >
                <option value="全部">全部品牌</option>
                <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
              </select>
            </div>

            <div>
              <label class="text-[10px] font-bold uppercase text-slate-400"
                >网格尺寸（选填，0=自动检测）</label
              >
              <div class="flex items-center gap-2 mt-1">
                <input
                  v-model.number="manualCols"
                  type="number"
                  min="0"
                  max="200"
                  placeholder="宽"
                  class="w-20 h-10 border border-slate-200 rounded-lg px-3 text-sm text-center focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
                <span class="text-slate-300 font-bold">×</span>
                <input
                  v-model.number="manualRows"
                  type="number"
                  min="0"
                  max="200"
                  placeholder="高"
                  class="w-20 h-10 border border-slate-200 rounded-lg px-3 text-sm text-center focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
                <span class="text-[10px] text-slate-400">留空自动检测</span>
              </div>
            </div>
          </div>

          <!-- 识别按钮 -->
          <button
            class="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            :disabled="recognizing"
            @click="startRecognize"
          >
            <LoaderIcon v-if="recognizing" :size="16" class="animate-spin" />
            <ScanTextIcon v-else :size="16" />
            {{ recognizing ? '识别中...' : '开始识别' }}
          </button>

          <button class="w-full text-xs text-slate-400 hover:text-slate-600" @click="reset">
            重新选择图片
          </button>
        </div>
      </div>

      <!-- 识别结果 -->
      <div v-else class="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <div class="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-2xl">
          <CheckCircleIcon :size="20" class="text-green-500" />
          <div>
            <div class="font-semibold text-sm text-green-800">识别完成</div>
            <div class="text-xs text-green-600">
              {{ result.gridWidth }}×{{ result.gridHeight }} · 置信度
              {{ Math.round((result.confidence || 0.5) * 100) }}%
            </div>
          </div>
        </div>

        <!-- 预览 -->
        <div class="bg-slate-100 rounded-2xl p-4 flex items-center justify-center">
          <canvas
            ref="previewCanvas"
            class="max-w-full max-h-[200px] rounded-lg pixel-thumb shadow-sm"
          />
        </div>

        <div class="flex gap-3">
          <button
            class="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 active:scale-[0.98] transition-all"
            @click="reset"
          >
            重新识别
          </button>
          <button
            class="flex-1 h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark active:scale-[0.98] transition-all"
            @click="importToEditor"
          >
            导入编辑器
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon, ScanTextIcon, InfoIcon, LoaderIcon, CheckCircleIcon } from 'lucide-vue-next'
import API from '@/api/index.js'
import { useToast } from '@/composables/useToast.js'
import { useImageCrop } from '@/composables/useImageCrop.js'

const router = useRouter()
const toast = useToast()

// 裁剪交互
const cropCtrl = useImageCrop()

const imageSrc = ref('')
const originalFile = ref(null)
const imgLoaded = ref(false)
const imgDisplayW = ref(0)
const imgDisplayH = ref(0)
const brand = ref('全部')
const brands = ref([])
const manualRows = ref(0)
const manualCols = ref(0)
const recognizing = ref(false)
const result = ref(null)
const previewCanvas = ref(null)

onMounted(async () => {
  try {
  } catch (_) {}
  try {
    const res = await API.get('/api/beads/colors', false)
    brands.value = [...new Set((res.data || []).map((c) => c.brand))]
  } catch {
    /* ignore */
  }
})

function onFileSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return
  originalFile.value = file
  const reader = new FileReader()
  reader.onload = (ev) => {
    imageSrc.value = ev.target.result
  }
  reader.readAsDataURL(file)
}

function onOcrImageLoad(e) {
  const img = e.target
  const maxW = 500
  const s = Math.min(1, maxW / Math.max(img.naturalWidth, img.naturalHeight))
  imgDisplayW.value = Math.round(img.naturalWidth * s)
  imgDisplayH.value = Math.round(img.naturalHeight * s)
  cropCtrl.setImageSize(img.naturalWidth, img.naturalHeight, s)
  cropCtrl.initCrop()
  imgLoaded.value = true
}

async function startRecognize() {
  if (!originalFile.value) return
  recognizing.value = true
  result.value = null
  try {
    const form = new FormData()
    form.append('file', originalFile.value)
    const oc = cropCtrl.getOriginalCrop()
    if (oc.w > 0 && oc.h > 0) {
      form.append('cropX', String(oc.x))
      form.append('cropY', String(oc.y))
      form.append('cropW', String(oc.w))
      form.append('cropH', String(oc.h))
    }
    if (brand.value && brand.value !== '全部') form.append('brand', brand.value)
    if (manualRows.value > 0) form.append('gridRows', String(manualRows.value))
    if (manualCols.value > 0) form.append('gridCols', String(manualCols.value))

    const res = await API.upload('/api/ocr/recognize', form)
    if (res.code === 200) {
      result.value = res.data
      nextTick(() => renderPreview(res.data))
    } else {
      toast.show(res.message || '识别失败，请确认图片包含清晰的色号标注')
    }
  } catch (e) {
    toast.show('识别失败: ' + (e.message || '网络错误'))
  } finally {
    recognizing.value = false
  }
}

function renderPreview(data) {
  const canvas = previewCanvas.value
  if (!canvas || !data.grid) return
  const grid = data.grid,
    w = data.gridWidth,
    h = data.gridHeight
  const size = 200,
    cellSize = Math.max(2, Math.floor(size / Math.max(w, h)))
  canvas.width = w * cellSize
  canvas.height = h * cellSize
  canvas.style.width = w * cellSize + 'px'
  canvas.style.height = h * cellSize + 'px'
  const ctx = canvas.getContext('2d')
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const cell = grid[r]?.[c]
      ctx.fillStyle = cell && cell.hex ? cell.hex : '#f0f0f0'
      ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
    }
  }
}

function importToEditor() {
  if (!result.value || !result.value.grid) return
  sessionStorage.setItem(
    'imported_grid',
    JSON.stringify({
      grid: result.value.grid,
      gridWidth: result.value.gridWidth,
      gridHeight: result.value.gridHeight,
    })
  )
  sessionStorage.setItem('import_toast', 'OCR 识别完成，已导入编辑器')
  router.replace('/editor')
}

function reset() {
  result.value = null
  imageSrc.value = ''
  originalFile.value = null
}
</script>

<style scoped>
.pixel-thumb {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
