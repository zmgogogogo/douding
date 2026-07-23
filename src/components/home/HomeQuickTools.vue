<!-- ============================================
  HomeQuickTools.vue — 快捷工具宫格区
  文档 3.5：2行4列，8个工具
  文字转拼豆 / 色板工具 / 豆仓管理 / 找色助手 /
  尺寸计算 / 制作教程 / 图纸打印 / 更多工具
============================================ -->
<template>
  <div class="px-4 mb-4">
    <!-- 标题行 -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-semibold text-slate-800">快捷工具</h3>
    </div>

    <!-- 2行4列宫格 -->
    <div class="grid grid-cols-4 gap-x-2 gap-y-3">
      <div
        v-for="tool in tools"
        :key="tool.name"
        class="flex flex-col items-center gap-1 cursor-pointer group py-1"
        @click="onClick(tool)"
      >
        <!-- 图标 -->
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 group-hover:bg-slate-200/80 transition-colors"
        >
          <component :is="tool.icon" :size="20" class="text-slate-600" />
        </div>
        <!-- 文字 -->
        <span class="text-[12px] text-slate-500 text-center leading-tight">
          {{ tool.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import {
  TypeIcon,
  PaletteIcon,
  PackageIcon,
  ScanIcon,
  CalculatorIcon,
  BookOpenIcon,
  PrinterIcon,
  MoreHorizontalIcon,
} from 'lucide-vue-next'

const router = useRouter()

const tools = [
  { name: '文字转拼豆', icon: TypeIcon, route: '/editor?mode=text' },
  { name: '色板工具', icon: PaletteIcon, route: '/palette' },
  { name: '豆仓管理', icon: PackageIcon, route: '/warehouse' },
  { name: '找色助手', icon: ScanIcon, route: '/color-finder' },
  { name: '尺寸计算', icon: CalculatorIcon, route: '/calculator' },
  { name: '制作教程', icon: BookOpenIcon, route: '/tutorials' },
  { name: '图纸打印', icon: PrinterIcon, route: '/print' },
  { name: '更多工具', icon: MoreHorizontalIcon, route: '/tools' },
]

function onClick(tool) {
  router.push(tool.route)
}
</script>
