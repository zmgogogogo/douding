<!-- ============================================
  HomeFAB.vue — 悬浮创作按钮
  文档 3.9：56px圆形，右下角悬浮
  向下滚动隐藏，向上滚动显示
  点击弹出创作选项菜单
============================================ -->
<template>
  <!-- 遮罩层 -->
  <div
    v-if="menuOpen"
    class="fixed inset-0 z-40 bg-black/30 transition-opacity duration-200"
    @click="menuOpen = false"
  />

  <!-- 创作选项菜单 -->
  <Transition name="slide-up">
    <div
      v-if="menuOpen"
      class="fixed bottom-24 right-4 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden w-48"
    >
      <button
        v-for="opt in createOptions"
        :key="opt.label"
        class="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-50 last:border-b-0"
        @click="onSelect(opt)"
      >
        <component :is="opt.icon" :size="18" :style="{ color: opt.color }" />
        <span>{{ opt.label }}</span>
      </button>
    </div>
  </Transition>

  <!-- 悬浮按钮 -->
  <Transition name="fab-fade">
    <button
      v-show="visible"
      class="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg shadow-green-500/25 flex items-center justify-center hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
      @click="menuOpen = !menuOpen"
    >
      <PlusIcon :size="26" />
    </button>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { PlusIcon, ImageIcon, PenIcon, SparklesIcon, TypeIcon } from 'lucide-vue-next'

const router = useRouter()
const visible = ref(true)
const menuOpen = ref(false)

const createOptions = [
  { label: '图片转拼豆', icon: ImageIcon, color: '#16a34a', route: '/image-import' },
  { label: '空白创作', icon: PenIcon, color: '#2563eb', route: '/editor' },
  { label: 'Q版生成', icon: SparklesIcon, color: '#d97706', route: '/editor?mode=qstyle' },
  { label: '文字转拼豆', icon: TypeIcon, color: '#7c3aed', route: '/editor?mode=text' },
]

// 滚动方向检测
let lastScrollY = 0
let scrollThreshold = 50

function onScroll() {
  const scrollEl = document.querySelector('.home-scroll-container')
  const y = scrollEl ? scrollEl.scrollTop : window.scrollY
  const dy = y - lastScrollY
  if (Math.abs(dy) > scrollThreshold) {
    visible.value = dy < 0 || y < 200
    if (!visible.value) menuOpen.value = false
  }
  lastScrollY = y
}

function onSelect(opt) {
  menuOpen.value = false
  router.push(opt.route)
}

onMounted(() => {
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

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

.fab-fade-enter-active,
.fab-fade-leave-active {
  transition: all 0.25s ease;
}
.fab-fade-enter-from,
.fab-fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
