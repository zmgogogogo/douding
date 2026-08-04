<!-- ============================================
  App.vue — 根组件：按路由类型切换布局
============================================ -->
<template>
  <!-- 管理端路由：完全独立布局，不包裹任何容器 -->
  <div v-if="isAdminRoute" class="admin-root">
    <router-view />
    <AppToast :message="toastMessage" :visible="toastVisible" />
    <AppDialog ref="dialogRef" />
  </div>

  <!-- 全屏路由（导出页等）：无侧边栏，无容器 -->
  <div v-else-if="isFullScreenRoute" class="fullscreen-root">
    <router-view />
    <AppToast :message="toastMessage" :visible="toastVisible" />
    <AppDialog ref="dialogRef" />
  </div>

  <!-- 用户端路由：保持现有侧边栏布局 -->
  <div v-else class="flex h-full bg-slate-50">
    <AppSidebar />
    <main class="flex-1 min-w-0 overflow-hidden">
      <router-view />
    </main>
    <AppToast :message="toastMessage" :visible="toastVisible" />
    <AppDialog ref="dialogRef" />

    <!-- PWA 安装提示 -->
    <div
      v-if="showInstall"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] bg-white rounded-2xl shadow-xl border border-[var(--ui-border)] px-4 py-3 flex items-center gap-3 animate-slide-up"
    >
      <span class="text-sm font-medium text-slate-700">📱 安装豆丁到桌面</span>
      <button
        class="px-3 py-1 rounded-lg bg-primary text-white text-xs font-medium"
        @click="installApp"
      >
        安装
      </button>
      <button class="text-xs text-slate-400 hover:text-slate-600" @click="showInstall = false">
        稍后
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, provide, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import AppToast from './components/AppToast.vue'
import AppDialog from './components/AppDialog.vue'
import { useToast } from './composables/useToast.js'
import { DIALOG_KEY } from './composables/useDialog.js'

const route = useRoute()

// 判断是否为管理端路由
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

// 判断是否为全屏路由（导出页等）
const isFullScreenRoute = computed(() => route.meta?.fullScreen === true)

const { message: toastMessage, visible: toastVisible } = useToast()

// 全局对话框注入
const dialogRef = ref(null)
provide(DIALOG_KEY, dialogRef)

// PWA 安装提示
const showInstall = ref(false)
let installEvent = null

function onInstallPrompt(e) {
  e.preventDefault()
  installEvent = e
  showInstall.value = true
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onInstallPrompt)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', onInstallPrompt)
})

function installApp() {
  if (installEvent) {
    installEvent.prompt()
    installEvent.userChoice.then(() => {
      showInstall.value = false
      installEvent = null
    })
  }
}
</script>
