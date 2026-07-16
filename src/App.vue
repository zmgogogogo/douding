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
  </div>
</template>

<script setup>
import { ref, provide } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import AppToast from './components/AppToast.vue'
import AppDialog from './components/AppDialog.vue'
import { useToast } from './composables/useToast.js'
import { DIALOG_KEY } from './composables/useDialog.js'

const { message: toastMessage, visible: toastVisible } = useToast()

// 全局对话框注入
const dialogRef = ref(null)
provide(DIALOG_KEY, dialogRef)
</script>
