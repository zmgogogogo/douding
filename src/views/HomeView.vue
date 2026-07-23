<!-- ============================================
  HomeView.vue — 首页作品展示
  ============================================ -->
<template>
  <div class="home-scroll-container overflow-y-auto h-full scrollbar-hide">
    <!-- 顶部导航栏 -->
    <HomeTopNav />

    <!-- ============ 作品区 ============ -->
    <div class="px-4 pb-20 pt-2">
      <!-- 骨架屏加载 -->
      <div v-if="loading" class="columns-2 sm:columns-3 lg:columns-4 gap-2">
        <div
          v-for="i in 6"
          :key="i"
          class="break-inside-avoid mb-3 bg-white rounded-xl overflow-hidden animate-pulse"
        >
          <div class="bg-slate-200 w-full" :style="{ paddingBottom: 80 + (i % 3) * 40 + '%' }" />
          <div class="p-2.5 space-y-2">
            <div class="h-3 bg-slate-200 rounded w-3/4" />
            <div class="h-2.5 bg-slate-100 rounded w-1/2" />
          </div>
        </div>
      </div>

      <!-- 错误状态 -->
      <div
        v-else-if="error && items.length === 0"
        class="flex flex-col items-center justify-center py-20 gap-3"
      >
        <p class="text-sm text-slate-400">{{ error }}</p>
        <button
          class="px-5 py-2 bg-primary text-white rounded-full text-sm font-semibold active:scale-95 transition-all"
          @click="refresh"
        >
          重新加载
        </button>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="items.length === 0"
        class="flex flex-col items-center justify-center py-20 gap-3"
      >
        <PackageIcon :size="40" class="text-slate-200" />
        <p class="text-sm text-slate-400">暂无作品，快去创作吧</p>
        <button
          class="px-5 py-2 bg-primary text-white rounded-full text-sm font-semibold active:scale-95 transition-all"
          @click="$router.push('/editor')"
        >
          开始创作
        </button>
      </div>

      <!-- 双列瀑布流 -->
      <div v-else class="columns-2 sm:columns-3 lg:columns-4 gap-2">
        <HomeFeedCard
          v-for="item in items"
          :key="item.id"
          :item="item"
          @click="goDetail(item)"
          @like="handleLike(item)"
        />
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
import { LoaderIcon, PackageIcon } from 'lucide-vue-next'
import API from '@/api/index.js'

import HomeTopNav from '@/components/home/HomeTopNav.vue'
import HomeFeedCard from '@/components/home/HomeFeedCard.vue'

const router = useRouter()

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
    const res = await API.get(`/api/home/content/list?${params}`, false)
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

function handleLike(item) {
  API.post(`/api/designs/${item.id}/like`)
    .then((res) => {
      if (res.code === 200) {
        item.isLiked = !item.isLiked
        item.likesCount = (item.likesCount || 0) + (item.isLiked ? 1 : -1)
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
