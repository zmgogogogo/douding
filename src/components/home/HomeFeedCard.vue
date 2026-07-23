<!-- ============================================
  HomeFeedCard.vue — 首页内容流卡片
  文档 3.7：支持4种卡片类型
  模板卡片 / 作品卡片 / 教程卡片 / 活动卡片
============================================ -->
<template>
  <!-- 类型1：模板卡片 -->
  <div v-if="item.type === 'template'" class="feed-card" @click="$emit('click', item)">
    <!-- 缩略图 -->
    <div
      class="relative w-full bg-slate-100 overflow-hidden"
      :style="{ paddingBottom: thumbRatio }"
    >
      <img
        v-if="item.thumbnail"
        :src="item.thumbnail"
        :alt="item.title"
        class="absolute inset-0 w-full h-full object-cover pixel-thumb"
        loading="lazy"
        @error="onImgError"
      />
      <div v-else class="absolute inset-0 flex items-center justify-center text-2xl text-slate-300">
        🧩
      </div>
      <!-- 角标 -->
      <span
        v-if="item.badge"
        class="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold"
        :class="badgeClass(item.badge)"
      >
        {{ item.badge }}
      </span>
    </div>
    <!-- 信息区 -->
    <div class="p-2.5">
      <div class="text-[13px] font-semibold text-slate-800 line-clamp-2 leading-snug mb-1.5">
        {{ item.title }}
      </div>
      <div class="flex items-center justify-between">
        <span class="text-[11px] text-slate-400 truncate">
          <template v-if="item.gridWidth">{{ item.gridWidth }}×{{ item.gridHeight }}</template>
          <template v-if="item.colorCount"> · {{ item.colorCount }}色</template>
        </span>
        <span class="text-[11px] text-slate-400 flex-shrink-0 ml-1">
          {{ formatNum(item.useCount || 0) }} 使用
        </span>
      </div>
    </div>
  </div>

  <!-- 类型2：用户作品卡片 -->
  <div v-else-if="item.type === 'works'" class="feed-card" @click="$emit('click', item)">
    <div
      class="relative w-full bg-slate-100 overflow-hidden"
      :style="{ paddingBottom: thumbRatio }"
    >
      <img
        v-if="item.thumbnail"
        :src="item.thumbnail"
        :alt="item.title"
        class="absolute inset-0 w-full h-full object-cover pixel-thumb"
        loading="lazy"
        @error="onImgError"
      />
      <div v-else class="absolute inset-0 flex items-center justify-center text-2xl text-slate-300">
        🧩
      </div>
    </div>
    <div class="p-2.5">
      <!-- 作者信息 -->
      <div class="flex items-center gap-1.5 mb-1.5">
        <img
          v-if="item.author?.avatar"
          :src="item.author.avatar"
          class="w-4 h-4 rounded-full object-cover flex-shrink-0"
          alt=""
        />
        <div
          v-else
          class="w-4 h-4 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center"
        >
          <UserIcon :size="9" class="text-slate-400" />
        </div>
        <span class="text-[11px] text-slate-500 truncate flex-1 min-w-0 leading-tight">
          {{ item.author?.nickname || item.author?.username || '匿名' }}
        </span>
      </div>
      <!-- 标题 -->
      <div class="text-[13px] text-slate-800 line-clamp-1 leading-snug mb-1.5">
        {{ item.title }}
      </div>
      <!-- 互动数据 -->
      <div class="flex items-center gap-3">
        <button
          class="flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-red-500 transition-colors"
          @click.stop="$emit('like', item)"
        >
          <HeartIcon :size="12" :class="item.isLiked ? 'fill-red-500 text-red-500' : ''" />
          {{ formatNum(item.likesCount || 0) }}
        </button>
        <span class="flex items-center gap-0.5 text-[11px] text-slate-400">
          <MessageCircleIcon :size="12" />
          {{ formatNum(item.commentCount || 0) }}
        </span>
      </div>
    </div>
  </div>

  <!-- 类型3：教程卡片 -->
  <div v-else-if="item.type === 'tutorial'" class="feed-card" @click="$emit('click', item)">
    <div class="relative w-full bg-slate-100 overflow-hidden" :style="{ paddingBottom: '56%' }">
      <img
        v-if="item.thumbnail"
        :src="item.thumbnail"
        :alt="item.title"
        class="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        @error="onImgError"
      />
      <div v-else class="absolute inset-0 flex items-center justify-center text-slate-300">
        <BookOpenIcon :size="28" />
      </div>
    </div>
    <div class="p-2.5">
      <div class="text-[13px] font-semibold text-slate-800 line-clamp-2 leading-snug mb-1.5">
        {{ item.title }}
      </div>
      <div class="flex items-center gap-1.5 mb-1.5">
        <span
          v-for="tag in item.tags || []"
          :key="tag"
          class="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500"
          >{{ tag }}</span
        >
      </div>
      <div class="flex items-center gap-3 text-[11px] text-slate-400">
        <span>{{ formatNum(item.readCount || 0) }} 阅读</span>
        <span>{{ formatNum(item.favCount || 0) }} 收藏</span>
      </div>
    </div>
  </div>

  <!-- 类型4：活动话题卡片 -->
  <div v-else-if="item.type === 'activity'" class="feed-card" @click="$emit('click', item)">
    <div
      class="w-full h-24 rounded-t-xl flex flex-col items-center justify-center relative overflow-hidden"
      :style="{ backgroundColor: item.bgColor || '#fef3c7' }"
    >
      <div class="text-lg font-bold text-slate-800 relative z-10">{{ item.title }}</div>
      <div v-if="item.subtitle" class="text-xs text-slate-600 mt-0.5 relative z-10">
        {{ item.subtitle }}
      </div>
    </div>
    <div class="p-2.5">
      <div class="flex items-center justify-between text-[11px] text-slate-400 mb-2">
        <span>{{ formatNum(item.joinCount || 0) }} 人参与</span>
        <span v-if="item.remaining" class="text-red-400">{{ item.remaining }}</span>
      </div>
      <button
        class="w-full py-1.5 rounded-full bg-primary text-white text-xs font-medium active:scale-95 transition-transform"
        @click.stop="$emit('join', item)"
      >
        立即参与
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { UserIcon, HeartIcon, MessageCircleIcon, BookOpenIcon } from 'lucide-vue-next'

const props = defineProps({
  item: { type: Object, required: true },
})

defineEmits(['click', 'like', 'join'])

// 根据图片比例计算 padding-bottom（默认正方形）
const thumbRatio = computed(() => {
  const w = props.item.gridWidth || 1
  const h = props.item.gridHeight || 1
  if (w && h && w !== h) {
    return `${Math.min((h / w) * 100, 150)}%`
  }
  return '100%'
})

function badgeClass(badge) {
  const map = {
    官方: 'bg-primary text-white',
    会员: 'bg-amber-500 text-white',
    热门: 'bg-red-500 text-white',
    NEW: 'bg-purple-500 text-white',
  }
  return map[badge] || 'bg-slate-600 text-white'
}

function formatNum(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function onImgError(e) {
  e.target.style.display = 'none'
}
</script>

<style scoped>
.feed-card {
  @apply bg-white rounded-xl overflow-hidden break-inside-avoid mb-3
         border border-black/[0.04]
         shadow-[0_1px_3px_rgba(0,0,0,.04)]
         active:scale-[0.98] transition-transform duration-100 cursor-pointer;
}
.pixel-thumb {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
