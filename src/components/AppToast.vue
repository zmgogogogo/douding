<!-- ============================================
  AppToast.vue — 全局提示条
============================================ -->
<template>
  <Teleport to="body">
    <div
      class="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-full transition-opacity duration-200 pointer-events-none"
      :class="visible ? 'opacity-100' : 'opacity-0'"
    >
      {{ message }}
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  message: { type: String, default: '' },
  visible: { type: Boolean, default: false },
})
</script>
