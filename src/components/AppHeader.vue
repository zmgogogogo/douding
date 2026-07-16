<!-- ============================================
  AppHeader.vue — 顶栏导航（毛玻璃效果）
============================================ -->
<template>
  <header class="glass-nav flex items-center gap-1 h-[52px] px-4 z-30 flex-shrink-0">
    <!-- Logo + 品牌名 -->
    <span class="text-xl cursor-pointer flex items-center" @click="$router.push('/')">🧩</span>
    <span class="text-base font-bold cursor-pointer text-slate-900 mr-2" @click="$router.push('/')">豆丁</span>

    <div class="flex-1" />

    <!-- 导航链接 -->
    <router-link to="/" class="nav-link" active-class="nav-link-active">
      发现
    </router-link>
    <router-link v-if="auth.isLoggedIn.value" to="/warehouse" class="nav-link" active-class="nav-link-active">
      我的仓库
    </router-link>

    <div class="flex-1" />

    <!-- 新建按钮 -->
    <button class="btn-create" @click="$router.push('/editor')">
      <PlusIcon :size="16" />
      <span class="hidden sm:inline">开始创作</span>
    </button>

    <!-- 登录按钮（未登录时） -->
    <button v-if="!auth.isLoggedIn.value" class="btn-login" @click="$router.push('/login')">
      登录
    </button>

    <!-- 用户头像（已登录时） -->
    <button v-if="auth.isLoggedIn.value" class="avatar-btn" @click="$router.push(`/user/${auth.user.value?.id}`)">
      {{ userInitial }}
    </button>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { PlusIcon } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth.js'

const auth = useAuth()

const userInitial = computed(() => {
  if (!auth.user.value) return '?'
  return (auth.user.value.nickname || auth.user.value.username || '?').charAt(0).toUpperCase()
})
</script>

<style scoped>
.nav-link {
  @apply text-[13px] font-medium text-slate-500 px-3 py-1.5 rounded-full
         transition-all duration-150;
}
.nav-link:hover { @apply text-slate-700 bg-slate-100; }
.nav-link-active { @apply text-primary bg-primary-lighter font-semibold; }

.btn-create {
  @apply h-9 px-4 rounded-full text-[13px] font-semibold
         bg-primary text-white border-none
         inline-flex items-center gap-1
         transition-all duration-150 whitespace-nowrap;
}
.btn-create:hover {
  @apply bg-primary-dark -translate-y-px;
  box-shadow: 0 4px 12px rgba(0, 88, 188, .3);
}
.btn-create:active { @apply scale-[0.96]; }

.btn-login {
  @apply text-[13px] font-medium text-slate-500 px-3.5 py-1.5 ml-1
         rounded-full transition-all duration-150 bg-transparent border-none cursor-pointer;
}
.btn-login:hover { @apply text-slate-700 bg-slate-100; }

.avatar-btn {
  @apply w-8 h-8 ml-1 rounded-full bg-primary-light text-primary
         text-[13px] font-bold flex items-center justify-center
         cursor-pointer transition-all duration-150 border-none;
}
.avatar-btn:hover { @apply bg-primary text-white; }
</style>
