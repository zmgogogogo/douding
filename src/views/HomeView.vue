<!-- ============================================
  HomeView.vue — 首页：展示所有用户公开作品
  网格布局 + Chip 筛选 + 无限滚动
============================================ -->
<template>
  <div class="overflow-y-auto h-full scrollbar-hide" @scroll.passive="onScroll">

    <!-- 每日挑战 -->
    <div class="px-3 md:px-6 mb-4">
      <DailyChallenge />
    </div>

    <!-- 顶部分类栏 -->
    <div class="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100/80
                px-3 md:px-6 mb-4">
      <div class="flex items-center gap-2 h-12">
        <!-- 排序 Chip -->
        <div class="flex items-center gap-1.5">
          <button class="chip-sm" :class="sort === 'popular' ? 'chip-active' : 'chip-inactive'"
            @click="changeSort('popular')">最热</button>
          <button class="chip-sm" :class="sort === 'latest' ? 'chip-active' : 'chip-inactive'"
            @click="changeSort('latest')">最新</button>
        </div>
        <div class="flex-1" />
        <!-- 搜索入口 -->
        <button class="w-9 h-9 flex items-center justify-center rounded-full
                       hover:bg-slate-100 transition-colors flex-shrink-0"
          @click="$router.push('/search')">
          <SearchIcon :size="18" class="text-slate-500" />
        </button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="px-4 md:px-6 pb-10">
      <!-- 加载中 -->
      <div v-if="loading" class="flex items-center justify-center py-32">
        <LoaderIcon :size="24" class="animate-spin text-slate-300" />
        <span class="text-slate-400 text-sm ml-2">加载中...</span>
      </div>

      <!-- 错误 -->
      <div v-else-if="error && designs.length === 0"
        class="flex flex-col items-center justify-center py-20 gap-3">
        <p class="text-sm text-slate-400">{{ error }}</p>
        <button class="px-5 py-2 bg-primary text-white rounded-full text-sm font-semibold
                       active:scale-95 transition-all"
          @click="refresh">重新加载</button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="designs.length === 0"
        class="flex flex-col items-center justify-center py-20 gap-3">
        <PackageIcon :size="40" class="text-slate-200" />
        <p class="text-sm text-slate-400">还没有公开作品</p>
        <button class="px-5 py-2 bg-primary text-white rounded-full text-sm font-semibold
                       active:scale-95 transition-all"
          @click="$router.push('/editor')">开始创作</button>
      </div>

      <!-- 卡片网格 -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        <div
          v-for="d in designs" :key="d.id"
          class="design-card cursor-pointer"
          @click="$router.push('/detail/' + d.id)"
        >
          <!-- 缩略图 -->
          <div class="aspect-square bg-slate-100 overflow-hidden relative">
            <canvas
              v-if="d.gridData && !d.thumbnail"
              :ref="el => renderCardThumb(el, d)"
              class="w-full h-full pixel-thumb"
            />
            <img v-else-if="d.thumbnail" :src="d.thumbnail" :alt="d.title"
              class="w-full h-full pixel-thumb object-cover" loading="lazy" />
            <div v-else class="w-full h-full flex items-center justify-center text-3xl text-slate-200">
              🧩
            </div>
          </div>
          <!-- 信息 -->
          <div class="p-2.5">
            <div class="text-[13px] font-semibold text-slate-800 truncate mb-1">
              {{ d.title }}
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] text-slate-400 truncate flex-1 min-w-0">
                {{ d.author?.nickname || d.author?.username || '匿名' }}
              </span>
              <span class="text-[11px] text-slate-300 flex-shrink-0 ml-2">
                ❤ {{ formatNum(d.likesCount || 0) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div ref="sentinelRef" class="mt-6 flex justify-center min-h-[40px]">
        <div v-if="loadingMore" class="flex items-center gap-2 text-slate-400 py-4 text-sm">
          <LoaderIcon :size="18" class="animate-spin" />加载更多...
        </div>
        <span v-else-if="!hasMore && designs.length > 0"
          class="text-[11px] text-slate-300 py-4">— 已经到底了 —</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { SearchIcon, LoaderIcon, PackageIcon } from 'lucide-vue-next'
import API from '@/api/index.js'
import DailyChallenge from '@/components/DailyChallenge.vue'

const router = useRouter()

const sort = ref('latest')
const designs = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const hasMore = ref(true)
const page = ref(1)
const sentinelRef = ref(null)

function changeSort(key) {
  if (sort.value === key) return
  sort.value = key
  fetchData(true)
}

async function refresh() {
  await fetchData(true)
}

async function fetchData(reset = false) {
  if (reset) {
    page.value = 1
    hasMore.value = true
    designs.value = []
    error.value = ''
    loading.value = true
  }

  try {
    const res = await API.get(`/api/explore?sort=${sort.value}&page=${page.value}&limit=24`, false)
    const list = res.data.list || []
    if (reset) designs.value = list
    else designs.value.push(...list)
    hasMore.value = list.length === 24 && designs.value.length < (res.data.total || Infinity)
    page.value++
  } catch (e) {
    if (reset) error.value = '加载失败，请刷新重试'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  if (loadingMore.value || !hasMore.value || loading.value) return
  loadingMore.value = true
  fetchData(false)
}

// 无限滚动
let observer = null
function setupObserver() {
  if (observer) observer.disconnect()
  if (!sentinelRef.value) return
  observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !loading.value && !loadingMore.value && hasMore.value) {
      loadMore()
    }
  }, { rootMargin: '600px' })
  observer.observe(sentinelRef.value)
}

function onScroll() {}

// 缩略图渲染
const renderedThumbs = new Set()
function renderCardThumb(el, design) {
  if (!el || renderedThumbs.has(design.id)) return
  if (!design.gridData || !Array.isArray(design.gridData)) return
  renderedThumbs.add(design.id)
  try {
    const grid = design.gridData
    const size = Math.min(80, grid.length || 40)
    el.width = size; el.height = size
    const ctx = el.getContext('2d')
    if (!ctx) return
    const img = ctx.createImageData(size, size)
    for (let r = 0; r < size && r < grid.length; r++) {
      const row = grid[r] || []
      for (let c = 0; c < size && c < row.length; c++) {
        const cell = row[c]
        if (cell?.hex) {
          const idx = (r * size + c) * 4
          const h = cell.hex.replace('#', '')
          img.data[idx] = parseInt(h.substring(0, 2), 16)
          img.data[idx + 1] = parseInt(h.substring(2, 4), 16)
          img.data[idx + 2] = parseInt(h.substring(4, 6), 16)
          img.data[idx + 3] = 255
        }
      }
    }
    ctx.putImageData(img, 0, 0)
  } catch { /* ignore */ }
}

function formatNum(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

onMounted(() => {
  fetchData(true)
  nextTick(setupObserver)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<style scoped>
.chip-sm {
  @apply whitespace-nowrap border rounded-full flex-shrink-0
         px-3 py-1.5 text-xs font-medium
         transition-all duration-150;
}
.chip-active {
  @apply border-blue-200 bg-blue-50 text-blue-600;
}
.chip-inactive {
  @apply border-slate-200 text-slate-500 bg-transparent hover:bg-slate-50;
}
.design-card {
  @apply bg-white rounded-xl overflow-hidden
         border border-black/[0.04]
         shadow-[0_1px_3px_rgba(0,0,0,.04)]
         active:scale-[0.98] transition-transform duration-100;
}
.pixel-thumb {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
