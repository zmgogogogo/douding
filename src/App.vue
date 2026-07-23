<!-- ============================================
  App.vue — 根组件：全高侧边栏 + 主内容区
============================================ -->
<template>
  <div class="flex h-full bg-slate-50">
    <!-- 左侧导航菜单（全高，Logo 在顶部） -->
    <AppSidebar />

    <!-- 右侧主内容区 -->
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
import { ref, provide, onMounted, onUnmounted } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import AppToast from './components/AppToast.vue'
import AppDialog from './components/AppDialog.vue'
import { useToast } from './composables/useToast.js'
import { DIALOG_KEY } from './composables/useDialog.js'

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
