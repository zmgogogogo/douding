<!-- ============================================
  HomeBanner.vue — 首页 Banner 轮播区
  文档 3.3：160px高，自动轮播3秒，底部指示器
  无数据时隐藏整个区域
============================================ -->
<template>
  <div v-if="banners.length > 0" class="px-4 mb-4">
    <div class="relative w-full h-40 rounded-xl overflow-hidden bg-slate-100">
      <!-- 轮播内容 -->
      <div
        class="flex h-full transition-transform duration-500 ease-out"
        :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
      >
        <div
          v-for="(banner, i) in banners" :key="i"
          class="w-full h-full flex-shrink-0 flex items-center justify-center cursor-pointer relative"
          :style="{ backgroundColor: banner.bgColor || '#e2e8f0' }"
          @click="onBannerClick(banner)"
        >
          <!-- 背景图片 -->
          <img
            v-if="banner.image"
            :src="banner.image"
            :alt="banner.title"
            class="w-full h-full object-cover absolute inset-0"
            @error="onImgError($event)"
          />
          <!-- 文字叠加层 -->
          <div class="relative z-10 text-center px-8" v-if="banner.title">
            <h3 class="text-xl font-bold text-white drop-shadow-lg">{{ banner.title }}</h3>
            <p v-if="banner.subtitle" class="text-sm text-white/80 mt-1 drop-shadow">{{ banner.subtitle }}</p>
          </div>
        </div>
      </div>

      <!-- 底部指示器 -->
      <div
        v-if="banners.length > 1"
        class="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5"
      >
        <span
          v-for="(b, i) in banners" :key="i"
          class="inline-block rounded-full transition-all duration-300 cursor-pointer"
          :class="[
            i === currentIndex
              ? 'w-4 h-1.5 bg-white'
              : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
          ]"
          @click.stop="goTo(i)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  banners: { type: Array, default: () => [] }
})

const router = useRouter()
const currentIndex = ref(0)
let timer = null
const INTERVAL = 3000 // 3 秒自动轮播

function goTo(index) {
  currentIndex.value = index
  resetTimer()
}

function next() {
  if (props.banners.length <= 1) return
  currentIndex.value = (currentIndex.value + 1) % props.banners.length
}

function resetTimer() {
  clearInterval(timer)
  if (props.banners.length > 1) {
    timer = setInterval(next, INTERVAL)
  }
}

function onBannerClick(banner) {
  if (banner.link) {
    if (banner.link.startsWith('http')) {
      window.open(banner.link, '_blank')
    } else {
      router.push(banner.link)
    }
  }
}

function onImgError(e) {
  e.target.style.display = 'none'
}

onMounted(() => {
  resetTimer()
})

onBeforeUnmount(() => {
  clearInterval(timer)
})
</script>
