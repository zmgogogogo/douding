<!-- ============================================
  HomeView.vue — 首页纯作品瀑布流
  文档参考: .claude/作品展示2.md
  Tab: 最热/推荐/我的，CSS Column 瀑布流
============================================ -->
<template>
  <div
    class="home-scroll-container overflow-y-auto h-full scrollbar-hide"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <!-- 顶部导航栏 -->
    <HomeTopNav />

    <!-- ============ 作品 Tab 栏（文档 §2） ============ -->
    <div class="sticky z-20 bg-white border-b border-slate-100" style="top: 48px">
      <div class="flex items-center gap-6 px-4 h-10">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="relative flex-shrink-0 h-full flex items-center transition-colors duration-150"
          :class="[
            activeTab === t.key
              ? 'text-primary font-semibold text-[15px]'
              : 'text-slate-500 text-[14px] hover:text-slate-700',
          ]"
          @click="switchTab(t.key)"
        >
          {{ t.label }}
          <span
            v-if="activeTab === t.key"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
          />
        </button>
      </div>
    </div>

    <!-- ============ 下拉刷新指示器 ============ -->
    <div
      class="flex items-center justify-center overflow-hidden transition-all duration-200"
      :style="{ height: pullDistance > 40 ? '40px' : '0px', opacity: pullDistance > 40 ? 1 : 0 }"
    >
      <LoaderIcon v-if="pullDistance > 60" :size="18" class="animate-spin text-primary" />
      <span v-else class="text-xs text-slate-400">下拉刷新</span>
    </div>

    <!-- ============ 瀑布流内容区 ============ -->
    <div class="waterfall-wrapper px-4 md:px-6 lg:px-8 pb-20 pt-3">
      <!-- 骨架屏 -->
      <div v-if="loading && !items.length" class="flex gap-1.5 md:gap-2">
        <div class="flex-1 min-w-0 flex flex-col gap-1.5 md:gap-2">
          <div v-for="i in [0,2,4,6]" :key="'skel-' + i" class="masonry-skeleton">
            <div class="animate-pulse bg-slate-100 rounded-t-xl" :style="{ paddingBottom: skeletonHeights[i % skeletonHeights.length] }" />
            <div class="p-2.5 space-y-2">
              <div class="flex items-center gap-1.5">
                <div class="w-4 h-4 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
                <div class="h-3 bg-slate-100 rounded animate-pulse flex-1" />
              </div>
              <div class="h-3.5 bg-slate-100 rounded animate-pulse w-3/4" />
              <div class="flex gap-3">
                <div class="h-3 bg-slate-100 rounded animate-pulse w-10" />
                <div class="h-3 bg-slate-100 rounded animate-pulse w-10" />
              </div>
            </div>
          </div>
        </div>
        <div class="flex-1 min-w-0 flex flex-col gap-1.5 md:gap-2">
          <div v-for="i in [1,3,5,7]" :key="'skel-' + i" class="masonry-skeleton">
            <div class="animate-pulse bg-slate-100 rounded-t-xl" :style="{ paddingBottom: skeletonHeights[i % skeletonHeights.length] }" />
            <div class="p-2.5 space-y-2">
              <div class="flex items-center gap-1.5">
                <div class="w-4 h-4 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
                <div class="h-3 bg-slate-100 rounded animate-pulse flex-1" />
              </div>
              <div class="h-3.5 bg-slate-100 rounded animate-pulse w-3/4" />
              <div class="flex gap-3">
                <div class="h-3 bg-slate-100 rounded animate-pulse w-10" />
                <div class="h-3 bg-slate-100 rounded animate-pulse w-10" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 登录引导（"我的" Tab 未登录） -->
      <div v-else-if="needLogin" class="text-center py-20">
        <div class="text-4xl mb-3">🔒</div>
        <div class="text-slate-500 text-sm mb-4">登录后查看你的作品</div>
        <button
          class="px-6 py-2 rounded-full bg-primary text-white text-sm font-medium active:scale-95 transition-transform"
          @click="$router.push('/login')"
        >
          去登录
        </button>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error && !items.length" class="text-center py-20 text-slate-400 text-sm">
        {{ error }}
        <button class="text-primary underline ml-1" @click="refresh">重试</button>
      </div>

      <!-- 空数据 -->
      <div v-else-if="!loading && !items.length" class="text-center py-20">
        <div class="text-4xl mb-3">
          {{ activeTab === 'mine' ? '📭' : '🎨' }}
        </div>
        <div class="text-slate-400 text-sm mb-3">
          {{ activeTab === 'mine' ? '你还没有发布作品' : '暂无作品' }}
        </div>
        <button
          v-if="activeTab === 'mine'"
          class="px-5 py-2 rounded-full bg-primary text-white text-sm font-medium active:scale-95 transition-transform"
          @click="$router.push('/editor')"
        >
          去创作
        </button>
      </div>

      <!-- 瀑布流内容 -->
      <div v-else>
        <!-- 点赞空态提示 -->
        <div v-if="likesFallback" class="px-4 mb-3">
          <div class="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
            <HeartIcon :size="14" class="fill-amber-500 text-amber-500" />
            <span>还没有点赞过作品，为你推荐热门作品</span>
          </div>
        </div>
        <div class="flex gap-1.5 md:gap-2">
        <div
          v-for="(col, ci) in columnGroups"
          :key="ci"
          class="flex-1 min-w-0 flex flex-col gap-1.5 md:gap-2"
        >
          <div
            v-for="item in col"
            :key="item.id"
            class="masonry-card"
            @click="goDetail(item)"
          >
            <div class="relative w-full bg-slate-100 overflow-hidden" :style="{ paddingBottom: thumbRatio(item) }">
              <img v-if="item.thumbnail" :src="item.thumbnail" :alt="item.title" class="absolute inset-0 w-full h-full object-cover pixel-thumb" loading="lazy" @error="(e) => e.target.style.display = 'none'" />
              <HomeThumbCanvas v-else-if="item.gridData?.length" class="absolute inset-0 w-full h-full" :gridData="item.gridData" :gridWidth="item.gridWidth" :gridHeight="item.gridHeight" />
              <div v-else class="absolute inset-0 flex items-center justify-center text-2xl text-slate-300">🧩</div>
              <span v-if="activeTab === 'mine' && item.status === 0" class="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500 text-white">审核中</span>
            </div>
            <div class="p-2.5">
              <div class="text-[13px] font-bold text-slate-800 line-clamp-2 leading-snug mb-1.5">{{ item.title }}</div>
              <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span class="truncate max-w-[72px]">{{ item.author?.nickname || item.author?.username || '匿名' }}</span>
                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <button class="flex items-center gap-0.5 hover:text-red-500 transition-colors" :class="item.isLiked ? 'text-red-500' : ''" @click.stop="handleLike(item)">
                    <HeartIcon :size="12" :class="item.isLiked ? 'fill-red-500' : ''" />{{ fmtNum(item.likesCount || 0) }}
                  </button>
                  <span class="flex items-center gap-0.5">
                    <MessageCircleIcon :size="12" />{{ fmtNum(item.commentCount || 0) }}
                  </span>
                </div>
              </div>
              <div v-if="activeTab === 'mine'" class="flex gap-2 mt-2 pt-2 border-t border-slate-50">
                <button class="flex-1 py-1 text-[11px] rounded-full bg-slate-100 text-slate-600 active:bg-slate-200 transition-colors" @click.stop="editWork(item)">编辑</button>
                <button class="flex-1 py-1 text-[11px] rounded-full bg-red-50 text-red-500 active:bg-red-100 transition-colors" @click.stop="deleteWork(item)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多状态 -->
      <div class="mt-2 flex justify-center min-h-[40px]">
        <div v-if="loadingMore" class="flex items-center gap-2 text-slate-400 py-4 text-sm">
          <LoaderIcon :size="18" class="animate-spin" /> 加载中...
        </div>
        <div v-else-if="!hasMore && items.length > 0" class="text-[11px] text-slate-300 py-4">
          — 没有更多了 —
        </div>
        <div
          v-else-if="loadError"
          class="text-[11px] text-slate-400 py-4 cursor-pointer hover:text-primary transition-colors"
          @click="loadMore"
        >
          加载失败，点击重试
        </div>
      </div>

      <!-- 滚动哨兵 -->
      <div ref="sentinelRef" class="h-1" />
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { LoaderIcon, HeartIcon, MessageCircleIcon } from 'lucide-vue-next'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'

import HomeTopNav from '@/components/home/HomeTopNav.vue'
import HomeThumbCanvas from '@/components/home/HomeThumbCanvas.vue'

const router = useRouter()
const auth = useAuth()
const toast = useToast()

// ============ Tab 定义 ============
const tabs = [
  { key: 'hot', label: '最热' },
  { key: 'recommend', label: '推荐' },
  { key: 'mine', label: '我的' },
  { key: 'likes', label: '点赞' },
]

// ============ 状态 ============
const items = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const loadError = ref(false)
const error = ref('')
const hasMore = ref(true)
const needLogin = ref(false)
const likesFallback = ref(false)
const page = ref(1)

// Tab 持久化：优先读 localStorage
const savedTab = localStorage.getItem('home_active_tab')
const validTabs = tabs.map((t) => t.key)
const activeTab = ref(validTabs.includes(savedTab) ? savedTab : 'hot')

const sentinelRef = ref(null)

// 骨架屏不同高度模拟
const skeletonHeights = ['110%', '80%', '130%', '100%']

// ============ 响应式瀑布流列数 ============
const columnCount = ref(2)

function updateColumnCount() {
  const w = window.innerWidth
  if (w >= 1600) columnCount.value = 5
  else if (w >= 1200) columnCount.value = 4
  else if (w >= 768) columnCount.value = 3
  else columnCount.value = 2
}

// ============ JS 瀑布流分列（最短列优先，N列） ============
const columnGroups = computed(() => {
  const n = columnCount.value
  const cols = Array.from({ length: n }, () => [])
  const heights = new Array(n).fill(0)
  for (const item of items.value) {
    const w = item.gridWidth || 1
    const h = item.gridHeight || 1
    const estH = Math.min(h / w, 1.5) + 0.3
    const minIdx = heights.indexOf(Math.min(...heights))
    cols[minIdx].push(item)
    heights[minIdx] += estH
  }
  return cols
})

// ============ 下拉刷新 ============
const pullDistance = ref(0)
let touchStartY = 0
let isPulling = false

function onTouchStart(e) {
  if (containerScrolledToTop()) {
    touchStartY = e.touches[0].clientY
    isPulling = true
  }
}

function onTouchMove(e) {
  if (!isPulling) return
  const dy = e.touches[0].clientY - touchStartY
  if (dy > 0) {
    pullDistance.value = Math.min(dy, 100)
  }
}

function onTouchEnd() {
  if (pullDistance.value > 60) {
    refresh()
  }
  pullDistance.value = 0
  isPulling = false
}

function containerScrolledToTop() {
  const el = document.querySelector('.home-scroll-container')
  return el && el.scrollTop <= 5
}

// ============ 缩略图比例 ============
function thumbRatio(item) {
  const w = item.gridWidth || 1
  const h = item.gridHeight || 1
  if (w && h && w !== h) return `${Math.min((h / w) * 100, 150)}%`
  return '100%'
}

// ============ 数字格式化 ============
function fmtNum(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

// ============ Tab 切换 ============
function switchTab(key) {
  if (key === activeTab.value) return

  // 未登录拦截「我的」和「点赞」
  if ((key === 'mine' || key === 'likes') && !auth.isLoggedIn.value) {
    needLogin.value = true
    return
  }

  // 未登录拦截「推荐」→ 降级为最热
  if (key === 'recommend' && !auth.isLoggedIn.value) {
    activeTab.value = 'hot'
    localStorage.setItem('home_active_tab', 'hot')
    fetchData(true)
    return
  }

  activeTab.value = key
  needLogin.value = false
  likesFallback.value = false
  localStorage.setItem('home_active_tab', key)
  fetchData(true)
}

// ============ 数据获取 ============
async function refresh() {
  await fetchData(true)
}

async function fetchData(reset = false) {
  if (reset) {
    page.value = 1
    hasMore.value = true
    items.value = []
    error.value = ''
    loadError.value = false
    needLogin.value = false
    loading.value = true
  }

  try {
    const params = new URLSearchParams({
      tab: activeTab.value,
      page: String(page.value),
      pageSize: '15',
    })
    const withAuth = auth.isLoggedIn.value
    const res = await API.get(`/api/work/list?${params}`, withAuth)

    // 需要登录
    if (res.data?.needLogin) {
      needLogin.value = true
      loading.value = false
      return
    }

    const list = (res.data.list || []).map((d) => ({
      ...d,
      author: d.author || { nickname: '匿名' },
    }))

    // 点赞 Tab 空态：回退展示热门作品
    if (activeTab.value === 'likes' && reset && list.length === 0) {
      likesFallback.value = true
      const hotRes = await API.get('/api/work/list?tab=hot&page=1&pageSize=15', false)
      const hotList = (hotRes.data?.list || []).map((d) => ({
        ...d,
        author: d.author || { nickname: '匿名' },
      }))
      items.value = hotList
      hasMore.value = hotRes.data?.hasMore ?? false
    } else {
      if (reset) items.value = list
      else items.value.push(...list)
      hasMore.value =
        res.data.hasMore ?? (list.length === 15 && items.value.length < (res.data.total || Infinity))
    }
    page.value++
  } catch (e) {
    if (reset) error.value = '网络异常，请稍后重试'
    else loadError.value = true
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  if (loadingMore.value || !hasMore.value || loading.value) return
  loadingMore.value = true
  loadError.value = false
  fetchData(false)
}

// ============ 卡片交互 ============
function goDetail(item) {
  router.push('/detail/' + item.id)
}

function handleLike(item) {
  if (!auth.isLoggedIn.value) return router.push('/login')
  API.post(`/api/designs/${item.id}/like`)
    .then((res) => {
      if (res.code === 200) {
        item.isLiked = res.data.liked
        item.likesCount = Math.max(0, (item.likesCount || 0) + (item.isLiked ? 1 : -1))
      }
    })
    .catch(() => {})
}

function editWork(item) {
  router.push('/editor/' + item.id)
}

function deleteWork(item) {
  if (!confirm('确定要删除这个作品吗？此操作不可撤销。')) return
  API.del(`/api/designs/${item.id}`)
    .then((res) => {
      if (res.code === 200) {
        items.value = items.value.filter((i) => i.id !== item.id)
        toast.show('已删除')
      }
    })
    .catch(() => toast.show('删除失败'))
}

// ============ 无限滚动 ============
let observer = null
function setupObserver() {
  if (observer) observer.disconnect()
  if (!sentinelRef.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loading.value && !loadingMore.value && hasMore.value) {
        loadMore()
      }
    },
    { rootMargin: '200px' }
  )
  observer.observe(sentinelRef.value)
}

watch(items, () => nextTick(setupObserver))

onMounted(() => {
  // 未登录时"推荐"降级为"最热"
  if (activeTab.value === 'recommend' && !auth.isLoggedIn.value) {
    activeTab.value = 'hot'
  }
  updateColumnCount()
  window.addEventListener('resize', updateColumnCount)
  fetchData(true)
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
  window.removeEventListener('resize', updateColumnCount)
})
</script>

<style>
/* ============================================
   瀑布流 — JS 最短列优先分列 + Flex 双列
   高度自适应，100% 可靠跨浏览器
   ============================================ */

/* 作品卡片 */
.masonry-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s;
}

.masonry-card:active {
  transform: scale(0.98);
}

@media (hover: hover) {
  .masonry-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

/* 骨架卡片 */
.masonry-skeleton {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.pixel-thumb {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
