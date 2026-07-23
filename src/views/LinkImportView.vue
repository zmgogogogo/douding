<!-- ============================================
  LinkImportView.vue — 外部链接导入
  粘贴小红书分享链接 → 后端爬虫解析 → 自动转图纸
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
      <span class="flex-1 text-center text-[15px] font-semibold text-slate-800">链接导入</span>
      <div class="w-8" />
    </header>

    <!-- 主内容 -->
    <div class="flex-1 overflow-y-auto">
      <div class="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <!-- 链接输入 -->
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400"
            >分享链接</label
          >
          <div class="flex gap-2">
            <input
              v-model="url"
              type="url"
              placeholder="粘贴小红书分享链接..."
              class="flex-1 h-11 border border-slate-200 rounded-xl px-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
            />
            <button
              class="h-11 px-6 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-40"
              :disabled="!url || loading"
              @click="parseLink"
            >
              <LoaderIcon v-if="loading" :size="16" class="animate-spin" />
              <SearchIcon v-else :size="16" />
              解析
            </button>
          </div>
        </div>

        <!-- 提示 -->
        <div
          class="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl"
        >
          <AlertCircleIcon :size="16" class="text-amber-500 flex-shrink-0 mt-0.5" />
          <span class="text-xs text-amber-700 leading-relaxed">
            支持小红书分享链接，解析页面中的拼豆图纸图片并自动转换。
            <span class="font-semibold">BETA</span> — 部分内容可能需要登录才能访问
          </span>
        </div>

        <!-- 加载动画 -->
        <div v-if="loading" class="flex flex-col items-center gap-3 py-8">
          <LoaderIcon :size="32" class="animate-spin text-primary" />
          <p class="text-sm text-slate-500">{{ loadingText }}</p>
        </div>

        <!-- 解析结果 -->
        <div v-if="parseResult && !loading" class="space-y-4">
          <div class="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
            <div class="flex items-center gap-2">
              <CheckCircleIcon :size="16" class="text-green-500" />
              <span class="font-semibold text-sm text-slate-800">{{
                parseResult.title || '解析成功'
              }}</span>
            </div>
            <p class="text-xs text-slate-400">
              提取到 {{ parseResult.images?.length || 0 }} 张图片
            </p>

            <!-- 图片预览 -->
            <div
              v-if="parseResult.imagePath"
              class="bg-slate-100 rounded-xl p-3 flex items-center justify-center"
            >
              <img :src="parseResult.imagePath" class="max-w-full max-h-[200px] rounded-lg" />
            </div>

            <!-- 设置 -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[10px] text-slate-400">目标宽度</label>
                <input
                  v-model.number="targetWidth"
                  type="number"
                  min="10"
                  max="200"
                  class="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm text-center mt-1"
                />
              </div>
              <div>
                <label class="text-[10px] text-slate-400">珠子品牌</label>
                <select
                  v-model="brand"
                  class="w-full h-9 border border-slate-200 rounded-lg px-2 text-xs mt-1"
                >
                  <option value="">全部</option>
                  <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 转换为图纸按钮 -->
          <button
            class="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            :disabled="converting"
            @click="convertToGrid"
          >
            <LoaderIcon v-if="converting" :size="16" class="animate-spin" />
            <WandIcon v-else :size="16" />
            {{ converting ? '转换中...' : '转换为图纸' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  SearchIcon,
  LoaderIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  WandIcon,
} from 'lucide-vue-next'
import API from '@/api/index.js'
import { useToast } from '@/composables/useToast.js'

const router = useRouter()
const toast = useToast()

const url = ref('')
const brand = ref('')
const targetWidth = ref(58)
const brands = ref([])
const loading = ref(false)
const converting = ref(false)
const loadingText = ref('正在解析链接...')
const parseResult = ref(null)

onMounted(async () => {
  try {
    const res = await API.get('/api/beads/colors', false)
    brands.value = [...new Set((res.data || []).map((c) => c.brand))]
  } catch {
    /* ignore */
  }
})

async function parseLink() {
  if (!url.value) return
  loading.value = true
  loadingText.value = '正在解析链接...'
  parseResult.value = null

  try {
    const res = await API.post('/api/crawler/import', {
      url: url.value,
      targetWidth: targetWidth.value,
      brand: brand.value || null,
    })
    if (res.code === 200) {
      parseResult.value = res.data
    } else if (res.code === 503) {
      toast.show(res.message || '爬虫服务未安装')
    } else {
      toast.show(res.message || '解析失败')
    }
  } catch (e) {
    toast.show('解析失败: ' + (e.message || '请重试'))
  } finally {
    loading.value = false
  }
}

async function convertToGrid() {
  if (!parseResult.value?.imagePath) return
  converting.value = true

  try {
    const resp = await fetch(parseResult.value.imagePath)
    const blob = await resp.blob()
    const form = new FormData()
    form.append('file', blob, 'crawled_image.png')
    form.append('targetWidth', String(targetWidth.value))
    if (brand.value) form.append('brand', brand.value)

    const res = await API.upload('/api/image-to-grid', form)
    if (res.code === 200) {
      sessionStorage.setItem('imported_grid', JSON.stringify(res.data))
      router.replace('/editor')
      toast.show('图片已转换为拼豆图纸！')
    } else {
      toast.show('转换失败: ' + (res.message || '请重试'))
    }
  } catch (e) {
    toast.show('转换失败: ' + (e.message || '请重试'))
  } finally {
    converting.value = false
  }
}
</script>
