<!--
  EditorErrorBoundary.vue — 编辑器错误边界
  异常恢复 + 崩溃提示 + 自动保存检测
-->
<template>
  <div v-if="hasError" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
    <div class="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl text-center">
      <div class="text-3xl mb-3">⚠️</div>
      <h3 class="text-sm font-semibold mb-2">编辑器遇到问题</h3>
      <p class="text-[11px] text-slate-500 mb-4">{{ error?.message || '未知错误' }}</p>
      <div class="flex gap-2 justify-center">
        <button class="px-4 py-1.5 rounded-lg text-xs border hover:bg-slate-50" @click="recover">
          恢复自动保存
        </button>
        <button class="px-4 py-1.5 rounded-lg text-xs bg-blue-500 text-white hover:bg-blue-600" @click="reload">
          重新加载
        </button>
      </div>
    </div>
  </div>
  <slot v-else />
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue'

const hasError = ref(false)
const error = ref(null)

onErrorCaptured((err) => {
  hasError.value = true
  error.value = err
  console.error('[ErrorBoundary] 捕获到错误:', err)
  return false // 阻止向上传播
})

function recover() {
  hasError.value = false; error.value = null
}

function reload() {
  location.reload()
}
</script>
