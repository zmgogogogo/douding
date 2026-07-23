<!-- ============================================
  HomeTopNav.vue — 首页顶部导航栏
  文档 3.1：Logo + 搜索 + 签到 + 消息 + 头像
  滚动时背景透明→白色过渡
============================================ -->
<template>
  <nav
    class="sticky top-0 z-30 px-4 flex items-center h-12 gap-3 transition-colors duration-300"
    :class="
      scrolled
        ? 'bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm'
        : 'bg-transparent'
    "
  >
    <!-- 品牌 Logo -->
    <div class="flex items-center gap-1.5 flex-shrink-0 cursor-pointer" @click="goHome">
      <div class="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
        <span class="text-white text-[10px] font-bold">豆</span>
      </div>
      <span class="text-base font-bold text-slate-800 hidden sm:block">豆丁</span>
    </div>

    <!-- 搜索入口（折叠式） -->
    <div
      class="flex-1 h-8 bg-slate-100 rounded-full flex items-center gap-1.5 px-3 cursor-pointer hover:bg-slate-200/80 transition-colors max-w-[240px]"
      @click="$router.push('/search')"
    >
      <SearchIcon :size="14" class="text-slate-400 flex-shrink-0" />
      <span class="text-xs text-slate-400 truncate">搜索模板 / 作品 / 教程</span>
    </div>

    <!-- 弹性空间（搜索框未撑满时） -->
    <div class="flex-1 sm:hidden" />

    <!-- 功能图标区 -->
    <div class="flex items-center gap-3 flex-shrink-0">
      <!-- 签到图标 -->
      <button class="relative w-6 h-6 flex items-center justify-center" title="签到">
        <CalendarIcon :size="20" class="text-slate-500 hover:text-slate-700 transition-colors" />
        <span
          v-if="!signedIn"
          class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white"
        />
      </button>

      <!-- 消息图标 -->
      <button
        class="relative w-6 h-6 flex items-center justify-center"
        @click="goMessages"
        title="消息"
      >
        <BellIcon :size="20" class="text-slate-500 hover:text-slate-700 transition-colors" />
        <span
          v-if="unreadCount > 0"
          class="absolute -top-0.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border border-white"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>

      <!-- 个人头像 -->
      <button
        class="w-6 h-6 rounded-full overflow-hidden bg-slate-200 flex-shrink-0"
        @click="goProfile"
      >
        <img
          v-if="auth.isLoggedIn.value && auth.user.value?.avatar"
          :src="auth.user.value.avatar"
          class="w-full h-full object-cover"
          alt="头像"
        />
        <UserIcon v-else :size="15" class="text-slate-400 m-auto mt-[3px]" />
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { SearchIcon, CalendarIcon, BellIcon, UserIcon } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth.js'

const router = useRouter()
const auth = useAuth()

const scrolled = ref(false)
const signedIn = ref(false)
const unreadCount = ref(0)

// 滚动监听：页面向下滚动时背景变白
let lastScrollY = 0
function onScroll() {
  const scrollEl = document.querySelector('.home-scroll-container')
  const y = scrollEl ? scrollEl.scrollTop : window.scrollY
  scrolled.value = y > 10
  lastScrollY = y
}

function goHome() {
  const scrollEl = document.querySelector('.home-scroll-container')
  if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' })
}

function goMessages() {
  router.push('/messages')
}

function goProfile() {
  if (auth.isLoggedIn.value) {
    router.push('/user/' + auth.user.value?.id)
  } else {
    router.push('/login')
  }
}

onMounted(() => {
  // 监听首页滚动容器
  const scrollEl = document.querySelector('.home-scroll-container')
  if (scrollEl) {
    scrollEl.addEventListener('scroll', onScroll, { passive: true })
  } else {
    window.addEventListener('scroll', onScroll, { passive: true })
  }
})

onBeforeUnmount(() => {
  const scrollEl = document.querySelector('.home-scroll-container')
  if (scrollEl) {
    scrollEl.removeEventListener('scroll', onScroll)
  } else {
    window.removeEventListener('scroll', onScroll)
  }
})
</script>
