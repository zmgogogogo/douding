<!-- ============================================
  HomeView.vue — 首页作品展示
  ============================================ -->
<template>
  <div class="home-scroll-container overflow-y-auto h-full scrollbar-hide">
    <!-- 顶部导航栏 -->
    <HomeTopNav />

    <!-- ============ 作品区 ============ -->
    <div class="px-4 pb-20 pt-2">
      <div v-if="loading" class="flex justify-center py-20">
        <LoaderIcon :size="24" class="animate-spin text-slate-300" />
      </div>
      <div v-else-if="error" class="text-center py-20 text-slate-400 text-sm">{{ error }} <button class="text-primary underline ml-1" @click="refresh">重试</button></div>
      <div v-else-if="!items.length" class="text-center py-20 text-slate-400 text-sm">暂无作品 <button class="text-primary underline ml-1" @click="$router.push('/editor')">去创作</button></div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        <div v-for="(item, idx) in items" :key="idx"
          style="background:#fff;border-radius:12px;overflow:hidden;cursor:pointer;border:1px solid rgba(0,0,0,0.08);box-shadow:0 1px 3px rgba(0,0,0,0.06)"
          @click="goDetail(item)">
          <div style="position:relative;width:100%;background:#f1f5f9;overflow:hidden;padding-bottom:100%">
            <HomeThumbCanvas v-if="item.gridData?.length" :gridData="item.gridData" :gridWidth="item.gridWidth" :gridHeight="item.gridHeight" />
            <div v-else style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;color:#cbd5e1">🧩</div>
          </div>
          <div style="padding:10px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <div style="width:16px;height:16px;border-radius:50%;background:#e2e8f0;flex-shrink:0;display:flex;align-items:center;justify-content:center">
                <span style="font-size:9px;color:#94a3b8">👤</span>
              </div>
              <span style="font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">{{ item.author?.nickname || '匿名' }}</span>
            </div>
            <div style="font-size:13px;color:#1e293b;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:6px">{{ item.title }}</div>
            <div style="display:flex;gap:12px;font-size:11px;color:#94a3b8">
              <button
                style="display:flex;align-items:center;gap:2px;border:none;background:none;cursor:pointer;padding:0;font:inherit;color:inherit;transition:color 0.15s"
                :style="{ color: item.isLiked ? '#ef4444' : '#94a3b8' }"
                @click.stop="handleLike(item)"
              >
                <HeartIcon :size="12" :class="item.isLiked ? 'fill-red-500 text-red-500' : ''" />
                {{ formatNum(item.likesCount || 0) }}
              </button>
              <button
                style="display:flex;align-items:center;gap:2px;border:none;background:none;cursor:pointer;padding:0;font:inherit;color:inherit;transition:color 0.15s"
                :style="{ color: item.isFavorited ? '#f59e0b' : '#94a3b8' }"
                @click.stop="handleFavorite(item)"
              >
                <BookmarkIcon :size="12" :class="item.isFavorited ? 'fill-amber-500 text-amber-500' : ''" />
                {{ formatNum(item.favoritesCount || 0) }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多状态 -->
      <div class="mt-4 flex justify-center min-h-[40px]">
        <div v-if="loadingMore" class="flex items-center gap-2 text-slate-400 py-4 text-sm">
          <LoaderIcon :size="18" class="animate-spin" />加载中...
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
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { LoaderIcon, HeartIcon, BookmarkIcon } from 'lucide-vue-next'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'

import HomeTopNav from '@/components/home/HomeTopNav.vue'
import HomeThumbCanvas from '@/components/home/HomeThumbCanvas.vue'
const router = useRouter()
const auth = useAuth()
const toast = useToast()

const items = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const loadError = ref(false)
const error = ref('')
const hasMore = ref(true)
const page = ref(1)
const sentinelRef = ref(null)

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
    loading.value = true
  }

  try {
    const params = new URLSearchParams({ page: String(page.value), limit: '20' })
    const res = await API.get(`/api/home/content/list?${params}`, auth.isLoggedIn.value)
    const list = (res.data.list || []).map((d) => ({
      ...d,
      type: d.type || 'works',
      author: d.author || { nickname: '匿名' },
    }))
    if (reset) items.value = list
    else items.value.push(...list)
    hasMore.value =
      res.data.hasMore ?? (list.length === 20 && items.value.length < (res.data.total || Infinity))
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

function goDetail(item) {
  router.push('/detail/' + item.id)
}

function formatNum(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function handleLike(item) {
  if (!auth.isLoggedIn.value) return router.push('/login')
  API.post(`/api/designs/${item.id}/like`)
    .then((res) => {
      if (res.code === 200) {
        item.isLiked = res.data.liked
        item.likesCount = (item.likesCount || 0) + (item.isLiked ? 1 : -1)
      }
    })
    .catch(() => {})
}

function handleFavorite(item) {
  if (!auth.isLoggedIn.value) return router.push('/login')
  API.post(`/api/designs/${item.id}/favorite`)
    .then((res) => {
      if (res.code === 200) {
        item.isFavorited = res.data.favorited
        item.favoritesCount = (item.favoritesCount || 0) + (item.isFavorited ? 1 : -1)
      }
    })
    .catch(() => {})
}

// 无限滚动
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
    { rootMargin: '400px' }
  )
  observer.observe(sentinelRef.value)
}

watch(items, () => nextTick(setupObserver))

onMounted(() => {
  fetchData(true)
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})
</script>
