<!-- ============================================
  AppDialog.vue — 替换浏览器原生 alert/confirm/prompt
  提供统一风格的模态对话框
============================================ -->
<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="visible" class="fixed inset-0 z-[100] flex items-center justify-center"
        @click.self="onCancel">
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" />

        <!-- 对话框 -->
        <div class="relative bg-white rounded-2xl shadow-2xl w-[360px] max-w-[90vw] overflow-hidden">
          <!-- 标题 -->
          <div v-if="title" class="px-5 pt-5 pb-0">
            <h3 class="text-base font-bold text-slate-800">{{ title }}</h3>
          </div>

          <!-- 消息 -->
          <div class="px-5 py-4">
            <p class="text-sm text-slate-600 leading-relaxed">{{ message }}</p>
            <!-- prompt 输入框 -->
            <input
              v-if="type === 'prompt'"
              ref="promptInput"
              v-model="inputValue"
              :placeholder="placeholder"
              class="w-full mt-3 h-10 px-3 border border-slate-200 rounded-xl text-sm outline-none
                     focus:border-primary transition-colors"
              @keydown.enter="onConfirm"
            />
          </div>

          <!-- 按钮 -->
          <div class="flex border-t border-slate-100">
            <button v-if="type !== 'alert'" class="flex-1 h-11 text-sm text-slate-500 font-medium
                     hover:bg-slate-50 active:bg-slate-100 transition-colors"
              @click="onCancel">{{ cancelText }}</button>
            <div v-if="type !== 'alert'" class="w-px bg-slate-100" />
            <button class="flex-1 h-11 text-sm font-semibold text-primary
                     hover:bg-primary/5 active:bg-primary/10 transition-colors"
              @click="onConfirm">{{ confirmText }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const visible = ref(false)
const type = ref('alert') // 'alert' | 'confirm' | 'prompt'
const title = ref('')
const message = ref('')
const inputValue = ref('')
const placeholder = ref('')
const confirmText = ref('确定')
const cancelText = ref('取消')
const promptInput = ref(null)

let resolvePromise = null

function show(opts) {
  type.value = opts.type || 'alert'
  title.value = opts.title || ''
  message.value = opts.message || ''
  inputValue.value = opts.defaultValue || ''
  placeholder.value = opts.placeholder || ''
  confirmText.value = opts.confirmText || '确定'
  cancelText.value = opts.cancelText || '取消'
  visible.value = true

  if (opts.type === 'prompt') {
    nextTick(() => promptInput.value?.focus())
  }

  return new Promise((resolve) => {
    resolvePromise = resolve
  })
}

function onConfirm() {
  visible.value = false
  if (type.value === 'prompt') {
    resolvePromise?.(inputValue.value)
  } else {
    resolvePromise?.(true)
  }
}

function onCancel() {
  visible.value = false
  resolvePromise?.(type.value === 'prompt' ? null : false)
}

defineExpose({ show, alert, confirm, prompt })

// 便捷方法
function alert(msg, title = '提示') {
  return show({ type: 'alert', message: msg, title })
}
function confirm(msg, title = '确认') {
  return show({ type: 'confirm', message: msg, title })
}
function prompt(msg, title = '输入', defaultValue = '', placeholder = '') {
  return show({ type: 'prompt', message: msg, title, defaultValue, placeholder })
}
</script>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-enter-active > div:last-child,
.dialog-leave-active > div:last-child {
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
.dialog-enter-from > div:last-child {
  transform: scale(0.95);
  opacity: 0;
}
.dialog-leave-to > div:last-child {
  transform: scale(0.95);
  opacity: 0;
}
</style>
