<!-- ============================================
  AppSidebar.vue — 左侧菜单栏
  三大区块：顶部用户信息 → 中部功能导航 → 底部备案信息
  固定悬浮，纵向通栏，白色底色
============================================ -->
<template>
  <!-- 移动端遮罩 -->
  <div
    v-if="mobileOpen"
    class="fixed inset-0 z-40 bg-black/30 md:hidden"
    @click="mobileOpen = false"
  />

  <!-- 侧边栏（固定定位，全高，白色） -->
  <aside
    class="sidebar"
    :class="{
      'translate-x-0': mobileOpen,
      '-translate-x-full md:translate-x-0': !mobileOpen
    }"
  >
    <!-- ===== 第一区块：顶部用户信息 ===== -->
    <div class="user-section" @click="goProfile">
      <!-- 圆形头像 -->
      <div class="avatar-circle">
        <img v-if="auth.isLoggedIn.value && auth.user.value?.avatar"
          :src="auth.user.value.avatar"
          class="w-full h-full object-cover rounded-full" />
        <UserIcon v-else :size="28" class="text-slate-300" />
      </div>

      <!-- 用户名 -->
      <div class="username">
        {{ auth.isLoggedIn.value
          ? (auth.user.value?.nickname || auth.user.value?.username || '豆友')
          : '游客' }}
      </div>

      <!-- 辅助提示小字 -->
      <div class="profile-hint">
        {{ auth.isLoggedIn.value ? '个人中心' : '点击登录' }}
      </div>
    </div>

    <!-- ===== 第二区块：中部功能导航菜单 ===== -->
    <nav class="nav-section">
      <router-link to="/" class="menu-item" :class="$route.path === '/' ? 'active' : ''"
        @click="mobileOpen = false">
        <HomeIcon :size="20" />
        <span>首页</span>
      </router-link>

      <router-link to="/editor" class="menu-item"
        :class="$route.path.startsWith('/editor') ? 'active' : ''"
        @click="mobileOpen = false">
        <PenIcon :size="20" />
        <span>创作</span>
      </router-link>

      <router-link to="/warehouse" class="menu-item"
        :class="$route.path.startsWith('/warehouse') ? 'active' : ''"
        @click="mobileOpen = false">
        <FolderIcon :size="20" />
        <span>仓库</span>
      </router-link>

      <a class="menu-item"
        :class="$route.path.startsWith('/user/') ? 'active' : ''"
        @click="goProfile">
        <UserIcon :size="20" />
        <span>我的</span>
      </a>
    </nav>

    <!-- 弹性空间：把备案信息推到底部 -->
    <div class="flex-1" />

    <!-- ===== 第三区块：底部备案信息 ===== -->
    <div class="footer-section">
      <p>ICP备XXXXXXXX号-1</p>
      <p class="mt-0.5">Copyright © 2024 豆丁</p>
    </div>
  </aside>

  <!-- 移动端汉堡按钮 -->
  <button
    class="fixed bottom-6 left-4 z-50 w-11 h-11 bg-primary text-white rounded-full shadow-lg
           flex items-center justify-center md:hidden
           hover:bg-primary-dark transition-colors active:scale-95"
    @click="mobileOpen = !mobileOpen"
  >
    <MenuIcon v-if="!mobileOpen" :size="22" />
    <XIcon v-else :size="22" />
  </button>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  HomeIcon, PenIcon, FolderIcon, UserIcon,
  MenuIcon, XIcon
} from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'

const router = useRouter()
const auth = useAuth()
const toast = useToast()

const mobileOpen = ref(false)

function goProfile() {
  mobileOpen.value = false
  if (auth.isLoggedIn.value) {
    router.push('/user/' + auth.user.value?.id)
  } else {
    router.push('/login')
  }
}
</script>

<style scoped>
/* 侧边栏：固定定位，全高，白色背景，固定宽度 */
.sidebar {
  @apply fixed md:relative z-50
         w-[220px] h-full bg-white
         flex flex-col flex-shrink-0
         transition-transform duration-300 ease-out;
}

/* ===== 第一区块：用户信息 ===== */
.user-section {
  @apply flex flex-col items-center px-4 pt-8 pb-6
         cursor-pointer select-none;
}
.avatar-circle {
  @apply w-[72px] h-[72px] rounded-full bg-slate-100
         flex items-center justify-center
         overflow-hidden mb-3
         ring-2 ring-slate-100;
}
.username {
  @apply text-[17px] font-semibold text-slate-900;
}
.profile-hint {
  @apply text-[12px] text-slate-400 mt-1;
}

/* ===== 第二区块：导航菜单 ===== */
.nav-section {
  @apply flex-1 overflow-y-auto px-3 py-2 space-y-0.5;
}
.menu-item {
  @apply flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-medium
         text-slate-500 transition-all duration-150 cursor-pointer w-full
         select-none;
}
.menu-item:hover { @apply bg-slate-50 text-slate-700; }
.menu-item.active {
  @apply bg-blue-50 text-[#2563eb] font-semibold;
}
.menu-item.active:hover { @apply bg-blue-100 text-[#2563eb]; }
.logout-btn {
  @apply text-slate-400 hover:text-red-500;
}

/* ===== 第三区块：备案信息 ===== */
.footer-section {
  @apply px-4 py-4 text-[11px] text-slate-300 text-center
         flex-shrink-0 select-none;
}
</style>
