<!-- ============================================
  HomeCoreTools.vue — 核心功能入口（四大金刚）
  文档 3.4：图片转拼豆 / 空白创作 / Q版生成 / 辅助拼豆
  48px图标 + 圆角背景 + 不同主题色，点击缩放反馈
============================================ -->
<template>
  <div class="px-4 mb-4">
    <div class="grid grid-cols-4 gap-3">
      <div
        v-for="tool in tools"
        :key="tool.name"
        class="flex flex-col items-center gap-1.5 cursor-pointer group"
        @click="onClick(tool)"
      >
        <!-- 图标容器 -->
        <div
          class="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-100 active:scale-90"
          :style="{ backgroundColor: tool.bgColor }"
        >
          <component :is="tool.icon" :size="24" :style="{ color: tool.iconColor }" />
        </div>
        <!-- 文字 -->
        <span class="text-[13px] text-slate-700 font-medium text-center leading-tight">
          {{ tool.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ImageIcon, PenIcon, SparklesIcon, Grid3X3Icon } from 'lucide-vue-next'

const router = useRouter()

const tools = [
  {
    name: '图片转拼豆',
    icon: ImageIcon,
    bgColor: '#dcfce7',
    iconColor: '#16a34a',
    route: '/image-import',
  },
  {
    name: '空白创作',
    icon: PenIcon,
    bgColor: '#dbeafe',
    iconColor: '#2563eb',
    route: '/editor',
  },
  {
    name: 'Q版生成',
    icon: SparklesIcon,
    bgColor: '#fef3c7',
    iconColor: '#d97706',
    route: '/editor?mode=qstyle',
  },
  {
    name: '辅助拼豆',
    icon: Grid3X3Icon,
    bgColor: '#fce7f3',
    iconColor: '#db2777',
    route: '/editor?mode=assist',
  },
]

function onClick(tool) {
  router.push(tool.route)
}
</script>
