<!-- ============================================
  LinkImportView.vue — 小红书链接一键导入转图纸
  文档规范：两阶段流程
  ① 粘贴链接 → 解析 → 展示笔记信息+图片列表
  ② 选择图片 + 确认版权 → 一键生成拼豆图纸
============================================ -->
<template>
  <div class="fixed inset-0 flex flex-col bg-slate-50 text-slate-900 overflow-hidden select-none z-50">
    <!-- 顶部导航 -->
    <header class="h-14 bg-white border-b border-slate-200 flex items-center px-4 flex-shrink-0">
      <button
        class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        @click="$router.back()"
      >
        <ArrowLeftIcon :size="20" class="text-slate-600" />
      </button>
      <span class="flex-1 text-center text-[15px] font-semibold text-slate-800">小红书导入</span>
      <div class="w-8" />
    </header>

    <!-- 主内容 -->
    <div class="flex-1 overflow-y-auto">
      <div class="p-4 md:p-8 max-w-2xl mx-auto space-y-6">

        <!-- ===== 区域1：链接输入区 ===== -->
        <div class="bg-white rounded-2xl border border-slate-100 p-5 space-y-3"
          style="box-shadow: var(--ui-shadow-sm)">
          <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            粘贴小红书笔记链接
          </h3>

          <!-- 输入框 + 解析按钮 -->
          <div class="flex gap-2">
            <div class="flex-1 relative">
              <input
                v-model="url"
                type="url"
                placeholder="支持 xhslink.com / xiaohongshu.com 链接"
                class="w-full h-11 border rounded-xl px-4 pr-9 text-sm outline-none transition-colors"
                :class="urlError
                  ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400/20'
                  : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20'"
                @input="onUrlInput"
                @keydown.enter="parseLink"
              />
              <!-- 清空按钮 -->
              <button
                v-if="url"
                class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
                @click="clearUrl"
              >
                <XIcon :size="14" />
              </button>
            </div>
            <button
              class="h-11 px-6 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              :disabled="!url || !!urlError || parsing"
              @click="parseLink"
            >
              <LoaderIcon v-if="parsing" :size="16" class="animate-spin" />
              <SearchIcon v-else :size="16" />
              {{ parsing ? '解析中...' : '解析图片' }}
            </button>
          </div>

          <!-- 链接格式错误提示 -->
          <p v-if="urlError" class="text-xs text-red-500 flex items-center gap-1">
            <AlertCircleIcon :size="12" />
            {{ urlError }}
          </p>

          <!-- 剪贴板检测提示 -->
          <div
            v-if="clipboardHint"
            class="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700"
          >
            <CheckCircleIcon :size="14" class="text-green-500" />
            检测到剪贴板中的小红书链接，已自动填入
          </div>
        </div>

        <!-- ===== 区域2：提示信息（未解析时显示） ===== -->
        <div
          v-if="!parseResult && !parsing"
          class="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl"
        >
          <AlertCircleIcon :size="16" class="text-amber-500 flex-shrink-0 mt-0.5" />
          <div class="space-y-1 text-xs text-amber-700 leading-relaxed">
            <p>支持小红书分享链接，自动提取笔记图片并生成拼豆图纸。</p>
            <p class="text-amber-500 font-medium">
              小贴士：在小红书 APP 中点击「复制链接」，回到本页面即可自动识别。
            </p>
          </div>
        </div>

        <!-- ===== 区域3：解析加载动画 ===== -->
        <div v-if="parsing" class="flex flex-col items-center gap-3 py-10">
          <LoaderIcon :size="32" class="animate-spin text-primary" />
          <p class="text-sm text-slate-500">正在解析链接，请稍候...</p>
        </div>

        <!-- ===== 区域4：解析失败状态 ===== -->
        <div
          v-if="parseError && !parsing"
          class="bg-white rounded-2xl border border-red-100 p-5 space-y-4"
          style="box-shadow: var(--ui-shadow-sm)"
        >
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <XCircleIcon :size="16" class="text-red-500" />
            </div>
            <div class="space-y-1">
              <p class="text-sm font-semibold text-slate-800">解析失败</p>
              <p class="text-xs text-slate-500">{{ parseError }}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              class="flex-1 h-10 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-dark transition-colors flex items-center justify-center gap-1.5"
              @click="parseLink"
            >
              <RefreshCwIcon :size="14" />
              重新解析
            </button>
            <button
              class="flex-1 h-10 rounded-xl bg-slate-100 text-slate-600 font-medium text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
              @click="$router.push('/image-import')"
            >
              <UploadIcon :size="14" />
              手动上传图片
            </button>
          </div>
        </div>

        <!-- ===== 区域5：解析成功结果 ===== -->
        <div v-if="parseResult && !parsing && !parseError" class="space-y-4">

          <!-- 5a. 笔记信息区 -->
          <div class="bg-white rounded-2xl border border-slate-100 p-4 space-y-3"
            style="box-shadow: var(--ui-shadow-sm)">
            <div class="flex items-center gap-3">
              <!-- 封面缩略图 -->
              <div class="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                <img
                  v-if="parseResult.coverUrl"
                  :src="parseResult.coverUrl"
                  class="w-full h-full object-cover"
                  referrerpolicy="no-referrer"
                  @error="(e) => e.target.style.display = 'none'"
                />
                <div
                  v-if="!parseResult.coverUrl"
                  class="w-full h-full flex items-center justify-center"
                >
                  <ImageIcon :size="24" class="text-slate-300" />
                </div>
              </div>
              <!-- 笔记信息 -->
              <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-sm text-slate-800 line-clamp-2">
                  {{ parseResult.title }}
                </h4>
                <p class="text-xs text-slate-400 mt-1">
                  @{{ parseResult.authorName }}
                </p>
                <div class="flex items-center gap-2 mt-1.5">
                  <span class="inline-block px-2 py-0.5 rounded-full bg-pink-50 text-[10px] text-pink-500 font-medium">
                    小红书
                  </span>
                  <span class="text-[10px] text-slate-400">
                    {{ parseResult.imageCount }} 张图片
                  </span>
                </div>
              </div>
            </div>

            <!-- 提取到的图片数量提示 -->
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <ImageIcon :size="14" />
              共提取到 <span class="font-semibold text-slate-700">{{ parseResult.imageCount }}</span> 张图片，请选择要转换的图片
            </div>
          </div>

          <!-- 5b. 图片选择网格 -->
          <div class="bg-white rounded-2xl border border-slate-100 p-4 space-y-3"
            style="box-shadow: var(--ui-shadow-sm)">
            <!-- 全选控制栏 -->
            <div class="flex items-center justify-between">
              <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                选择图片
              </h3>
              <button
                class="text-xs text-primary font-medium hover:underline"
                @click="toggleSelectAll"
              >
                {{ selectedAll ? '取消全选' : '全选' }}
              </button>
            </div>

            <!-- 图片网格（双列） -->
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="(img, idx) in parseResult.imageUrls"
                :key="idx"
                class="relative aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer group border-2 transition-all"
                :class="isSelected(idx)
                  ? 'border-primary shadow-md shadow-primary/10'
                  : 'border-transparent hover:border-slate-300'"
                @click="toggleImage(idx)"
              >
                <img
                  :src="img"
                  class="w-full h-full object-cover"
                  referrerpolicy="no-referrer"
                  loading="lazy"
                  @error="(e) => { e.target.src = ''; e.target.alt = '加载失败' }"
                />
                <!-- 选中勾选框 -->
                <div
                  class="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all"
                  :class="isSelected(idx)
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white/80 text-transparent group-hover:text-slate-300'"
                >
                  <CheckIcon v-if="isSelected(idx)" :size="14" />
                  <div v-else class="w-4 h-4 rounded-full border-2 border-slate-300" />
                </div>
                <!-- 序号角标 -->
                <div
                  class="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/40 text-white text-[10px] font-mono"
                >
                  {{ idx + 1 }}
                </div>
                <!-- 点击放大预览图标 -->
                <div
                  class="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MaximizeIcon :size="12" class="text-white" />
                </div>
              </div>
            </div>

            <!-- 选择统计 -->
            <p class="text-xs text-slate-400 text-center">
              共 <span class="font-semibold text-slate-600">{{ parseResult.imageCount }}</span> 张图片，已选中
              <span class="font-semibold text-primary">{{ selectedCount }}</span> 张
            </p>

            <!-- 图片放大预览弹窗 -->
            <Teleport to="body">
              <div
                v-if="previewImageUrl"
                class="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
                @click="previewImageUrl = null"
              >
                <button
                  class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  @click="previewImageUrl = null"
                >
                  <XIcon :size="20" />
                </button>
                <img
                  :src="previewImageUrl"
                  class="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain"
                  referrerpolicy="no-referrer"
                  @click.stop
                />
              </div>
            </Teleport>
          </div>

          <!-- 5c. 转图设置 -->
          <div class="bg-white rounded-2xl border border-slate-100 p-4 space-y-3"
            style="box-shadow: var(--ui-shadow-sm)">
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              转图设置
            </h3>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[10px] text-slate-400">目标宽度</label>
                <input
                  v-model.number="targetWidth"
                  type="number"
                  min="10"
                  max="200"
                  class="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm text-center mt-1 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label class="text-[10px] text-slate-400">珠子品牌</label>
                <select
                  v-model="brand"
                  class="w-full h-9 border border-slate-200 rounded-lg px-2 text-xs mt-1 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none bg-white"
                >
                  <option value="">全部品牌</option>
                  <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 5d. 版权确认 -->
          <div class="bg-white rounded-2xl border border-slate-100 p-4"
            style="box-shadow: var(--ui-shadow-sm)">
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                v-model="copyrightAgreed"
                type="checkbox"
                class="w-4 h-4 mt-0.5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
              />
              <div class="space-y-1">
                <span class="text-xs text-slate-600 leading-relaxed">
                  我确认仅用于<span class="font-semibold text-slate-700">个人学习使用</span>，尊重原作者版权，不做商用传播
                </span>
                <p class="text-[10px] text-slate-400">
                  本功能仅支持导入公开分享的笔记内容，导入内容仅限个人学习交流使用
                </p>
              </div>
            </label>
          </div>

          <!-- 5e. 一键生成按钮 -->
          <button
            class="w-full h-12 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style="box-shadow: var(--ui-shadow-md)"
            :disabled="converting || selectedCount === 0 || !copyrightAgreed"
            @click="submitConvert"
          >
            <LoaderIcon v-if="converting" :size="18" class="animate-spin" />
            <WandIcon v-else :size="18" />
            {{ converting ? '正在生成图纸...' : `一键生成拼豆图纸 (${selectedCount}张)` }}
          </button>

          <!-- 未满足条件的提示 -->
          <p v-if="selectedCount === 0" class="text-xs text-amber-500 text-center -mt-2">
            请至少选择一张图片
          </p>
          <p v-else-if="!copyrightAgreed" class="text-xs text-amber-500 text-center -mt-2">
            请先确认版权声明
          </p>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  SearchIcon,
  LoaderIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  XCircleIcon,
  XIcon,
  RefreshCwIcon,
  UploadIcon,
  ImageIcon,
  CheckIcon,
  MaximizeIcon,
  WandIcon,
} from 'lucide-vue-next'
import API from '@/api/index.js'
import { useToast } from '@/composables/useToast.js'

const router = useRouter()
const toast = useToast()

// ============================================
//  状态定义
// ============================================
const url = ref('')
const urlError = ref('')
const clipboardHint = ref(false)
const brand = ref('')
const targetWidth = ref(58)
const brands = ref([])

// 解析状态
const parsing = ref(false)
const parseResult = ref(null)
const parseError = ref('')

// 图片选择
const selectedImages = ref(new Set()) // 选中索引集合
const previewImageUrl = ref(null) // 放大预览的图片 URL

// 版权确认
const copyrightAgreed = ref(false)

// 转图状态
const converting = ref(false)

// ============================================
//  计算属性
// ============================================
const selectedCount = computed(() => selectedImages.value.size)
const selectedAll = computed(
  () => parseResult.value && selectedCount.value === parseResult.value.imageCount
)

// ============================================
//  链接格式校验
// ============================================
function isValidXhsUrl(val) {
  if (!val || !val.trim()) return true // 空值不报错
  const trimmed = val.trim()
  const shortPattern = /^https?:\/\/xhslink\.com\/[a-zA-Z0-9]+/
  const longPattern = /^https?:\/\/(www\.|mobile\.)?xiaohongshu\.com\/(explore|discovery\/item)\/[a-zA-Z0-9]+/
  return shortPattern.test(trimmed) || longPattern.test(trimmed)
}

function onUrlInput() {
  if (!url.value) {
    urlError.value = ''
    return
  }
  if (!isValidXhsUrl(url.value)) {
    urlError.value = '请输入有效的小红书笔记链接'
  } else {
    urlError.value = ''
  }
}

function clearUrl() {
  url.value = ''
  urlError.value = ''
  parseResult.value = null
  parseError.value = ''
  selectedImages.value = new Set()
  copyrightAgreed.value = false
}

// ============================================
//  剪贴板自动识别
// ============================================
async function checkClipboard() {
  try {
    // 仅在页面刚加载且未输入时检测
    if (url.value) return
    const text = await navigator.clipboard.readText()
    if (text && isValidXhsUrl(text)) {
      url.value = text.trim()
      clipboardHint.value = true
      // 3 秒后隐藏提示
      setTimeout(() => {
        clipboardHint.value = false
      }, 3000)
    }
  } catch {
    // 无剪贴板权限则忽略
  }
}

// ============================================
//  图片选择
// ============================================
function isSelected(idx) {
  return selectedImages.value.has(idx)
}

function toggleImage(idx) {
  const next = new Set(selectedImages.value)
  if (next.has(idx)) {
    next.delete(idx)
  } else {
    next.add(idx)
  }
  selectedImages.value = next
}

function toggleSelectAll() {
  if (!parseResult.value) return
  if (selectedAll.value) {
    selectedImages.value = new Set()
  } else {
    selectedImages.value = new Set(
      Array.from({ length: parseResult.value.imageCount }, (_, i) => i)
    )
  }
}

// ============================================
//  解析链接（阶段一）
// ============================================
async function parseLink() {
  if (!url.value || urlError.value) return

  parsing.value = true
  parseResult.value = null
  parseError.value = ''
  selectedImages.value = new Set()
  copyrightAgreed.value = false

  try {
    const res = await API.post('/api/crawler/parse', { url: url.value.trim() })

    if (res.code === 200) {
      parseResult.value = res.data
      // 默认全选所有图片
      selectedImages.value = new Set(
        Array.from({ length: res.data.imageCount }, (_, i) => i)
      )
    } else {
      parseError.value = res.message || '解析失败，请稍后重试'
    }
  } catch (e) {
    parseError.value = e.message || '解析失败，请检查链接后重试'
  } finally {
    parsing.value = false
  }
}

// ============================================
//  提交转图（阶段二）
// ============================================
async function submitConvert() {
  if (!parseResult.value || selectedCount.value === 0 || !copyrightAgreed.value) return

  converting.value = true

  try {
    // 获取选中图片的 URL
    const selectedUrls = []
    for (const idx of selectedImages.value) {
      selectedUrls.push(parseResult.value.imageUrls[idx])
    }

    // 方式1：使用新的两阶段接口
    const res = await API.post('/api/crawler/convert', {
      noteId: parseResult.value.noteId,
      imageUrls: selectedUrls,
      brand: brand.value || null,
      targetWidth: targetWidth.value,
      copyrightAgreed: copyrightAgreed.value,
    })

    if (res.code === 200) {
      // 如果后端直接返回了转图结果
      if (res.data?.convertResult?.code === 200) {
        sessionStorage.setItem('imported_grid', JSON.stringify(res.data.convertResult.data))
        sessionStorage.setItem('import_toast', '小红书图片已转换为拼豆图纸！')
        router.replace('/editor')
        toast.show('小红书图片已转换为拼豆图纸！')
      } else if (res.data?.downloadedImages?.length) {
        // 图片已下载，通过旧流程提交
        const firstImagePath = res.data.downloadedImages[0]
        const resp = await fetch(firstImagePath)
        const blob = await resp.blob()
        const form = new FormData()
        form.append('file', blob, 'xhs_image.png')
        form.append('targetWidth', String(targetWidth.value))
        if (brand.value) form.append('brand', brand.value)

        const convertRes = await API.upload('/api/image-to-grid', form)
        if (convertRes.code === 200) {
          sessionStorage.setItem('imported_grid', JSON.stringify(convertRes.data))
          router.replace('/editor')
          toast.show('小红书图片已转换为拼豆图纸！')
        } else {
          toast.show('转换失败: ' + (convertRes.message || '请重试'))
        }
      }
    } else {
      toast.show(res.message || '提交失败，请重试')
    }
  } catch (e) {
    // 如果新的两阶段接口不可用，回退到旧版一键接口
    try {
      const fallbackRes = await API.post('/api/crawler/import', {
        url: url.value.trim(),
        targetWidth: targetWidth.value,
        brand: brand.value || null,
      })

      if (fallbackRes.code === 200 && fallbackRes.data?.imagePath) {
        const resp = await fetch(fallbackRes.data.imagePath)
        const blob = await resp.blob()
        const form = new FormData()
        form.append('file', blob, 'xhs_image.png')
        form.append('targetWidth', String(targetWidth.value))
        if (brand.value) form.append('brand', brand.value)

        const convertRes = await API.upload('/api/image-to-grid', form)
        if (convertRes.code === 200) {
          sessionStorage.setItem('imported_grid', JSON.stringify(convertRes.data))
          router.replace('/editor')
          toast.show('小红书图片已转换为拼豆图纸！')
        } else {
          toast.show('转换失败: ' + (convertRes.message || '请重试'))
        }
      } else if (fallbackRes.code === 503) {
        toast.show(fallbackRes.message || '爬虫服务未安装')
      } else {
        toast.show(fallbackRes.message || '转换失败，请重试')
      }
    } catch (e2) {
      toast.show('转图失败: ' + (e2.message || '请重试'))
    }
  } finally {
    converting.value = false
  }
}

// ============================================
//  生命周期
// ============================================
onMounted(async () => {
  // 加载珠子品牌列表
  try {
    const res = await API.get('/api/beads/colors', false)
    brands.value = [...new Set((res.data || []).map((c) => c.brand))]
  } catch {
    /* ignore */
  }

  // 检测剪贴板
  checkClipboard()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
