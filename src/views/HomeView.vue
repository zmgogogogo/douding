<!-- ============================================
  HomeView.vue — 首页 Feed 流主页面
  文档：顶部导航 → Banner → 核心功能 → 快捷工具
       → 分类标签 → 双列瀑布流 → 悬浮按钮
============================================ -->
<template>
  <div class="home-scroll-container overflow-y-auto h-full scrollbar-hide">

    <!-- 3.1 顶部导航栏 -->
    <HomeTopNav />

    <!-- 3.3 Banner 轮播区 -->
    <HomeBanner :banners="banners" />

    <!-- 3.4 核心功能入口（四大金刚） -->
    <HomeCoreTools />

    <!-- 3.5 快捷工具宫格 -->
    <HomeQuickTools />

    <!-- 3.6 分类标签栏（sticky 吸顶，在导航栏下方） -->
    <HomeCategoryTabs :activeTab="activeTab" @change="changeTab" />

    <!-- ============ 内容区 ============ -->
    <div class="px-4 pb-20">
      <!-- 骨架屏加载 -->
      <div v-if="loading" class="columns-2 gap-3">
        <div v-for="i in 6" :key="i"
          class="break-inside-avoid mb-3 bg-white rounded-xl overflow-hidden animate-pulse">
          <div class="bg-slate-200 w-full" :style="{ paddingBottom: (80 + (i % 3) * 40) + '%' }" />
          <div class="p-2.5 space-y-2">
            <div class="h-3 bg-slate-200 rounded w-3/4" />
            <div class="h-2.5 bg-slate-100 rounded w-1/2" />
          </div>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error && items.length === 0"
        class="flex flex-col items-center justify-center py-20 gap-3">
        <p class="text-sm text-slate-400">{{ error }}</p>
        <button class="px-5 py-2 bg-primary text-white rounded-full text-sm font-semibold
                       active:scale-95 transition-all"
          @click="refresh">重新加载</button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="items.length === 0"
        class="flex flex-col items-center justify-center py-20 gap-3">
        <PackageIcon :size="40" class="text-slate-200" />
        <p class="text-sm text-slate-400">暂无内容，去看看其他分类吧</p>
        <button class="px-5 py-2 bg-primary text-white rounded-full text-sm font-semibold
                       active:scale-95 transition-all"
          @click="$router.push('/editor')">开始创作</button>
      </div>

      <!-- 双列瀑布流 -->
      <div v-else class="columns-2 gap-3">
        <HomeFeedCard
          v-for="item in items" :key="item.id"
          :item="item"
          @click="goDetail(item)"
          @like="handleLike(item)"
          @join="handleJoin(item)"
        />
      </div>

      <!-- 加载更多状态 -->
      <div class="mt-4 flex justify-center min-h-[40px]">
        <div v-if="loadingMore" class="flex items-center gap-2 text-slate-400 py-4 text-sm">
          <LoaderIcon :size="18" class="animate-spin" />加载中...
        </div>
        <div v-else-if="!hasMore && items.length > 0"
          class="text-[11px] text-slate-300 py-4">— 没有更多内容了 —</div>
        <div v-else-if="loadError"
          class="text-[11px] text-slate-400 py-4 cursor-pointer hover:text-primary transition-colors"
          @click="loadMore">加载失败，点击重试</div>
      </div>

      <!-- 滚动哨兵 -->
      <div ref="sentinelRef" class="h-1" />
    </div>

    <!-- 3.9 悬浮创作按钮 -->
    <HomeFAB />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { LoaderIcon, PackageIcon } from 'lucide-vue-next'
import API from '@/api/index.js'

import HomeTopNav from '@/components/home/HomeTopNav.vue'
import HomeBanner from '@/components/home/HomeBanner.vue'
import HomeCoreTools from '@/components/home/HomeCoreTools.vue'
import HomeQuickTools from '@/components/home/HomeQuickTools.vue'
import HomeCategoryTabs from '@/components/home/HomeCategoryTabs.vue'
import HomeFeedCard from '@/components/home/HomeFeedCard.vue'
import HomeFAB from '@/components/home/HomeFAB.vue'

const router = useRouter()

// ====== Banner（首版硬编码，后续接后台） ======
const banners = ref([
  { bgColor: '#22c55e', title: '欢迎来到豆丁', subtitle: '开始你的拼豆创作之旅', link: '/editor' },
  { bgColor: '#8b5cf6', title: 'Q版生成上线', subtitle: '一键生成Q版拼豆图纸', link: '/editor?mode=qstyle' }
])

// ====== 分类与数据 ======
const activeTab = ref('recommend')
const items = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const loadError = ref(false)
const error = ref('')
const hasMore = ref(true)
const page = ref(1)
const sentinelRef = ref(null)

function changeTab(tab) {
  if (activeTab.value === tab) return
  activeTab.value = tab
  fetchData(true)
}

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
    // 首页使用 /api/home/content/list 分页接口
    const params = new URLSearchParams({
      category: activeTab.value,
      page: String(page.value),
      limit: '20'
    })
    const res = await API.get(`/api/home/content/list?${params}`, false)
    const list = (res.data.list || []).map(d => ({
      ...d,
      type: d.type || 'works',
      author: d.author || { nickname: '匿名' }
    }))
    if (reset) items.value = list
    else items.value.push(...list)
    hasMore.value = res.data.hasMore ?? (list.length === 20 && items.value.length < (res.data.total || Infinity))
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

// ====== 卡片事件 ======
function goDetail(item) {
  router.push('/detail/' + item.id)
}

function handleLike(item) {
  // 点赞/取消点赞
  API.post(`/api/designs/${item.id}/like`).then(res => {
    if (res.code === 200) {
      item.isLiked = !item.isLiked
      item.likesCount = (item.likesCount || 0) + (item.isLiked ? 1 : -1)
    }
  }).catch(() => {})
}

function handleJoin(item) {
  // 参与活动
  router.push('/detail/' + item.id)
}

// ====== 无限滚动 ======
let observer = null
function setupObserver() {
  if (observer) observer.disconnect()
  if (!sentinelRef.value) return
  observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !loading.value && !loadingMore.value && hasMore.value) {
      loadMore()
    }
  }, { rootMargin: '400px' })
  observer.observe(sentinelRef.value)
}

watch(items, () => nextTick(setupObserver))

onMounted(() => {
  fetchData(true)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>
