<!-- ============================================
  HomeCategoryTabs.vue — 分类标签导航栏
  文档 3.6：推荐/热门/模板/作品/教程/活动
  选中态加粗 + 底部2px主题色下划线，sticky吸顶
============================================ -->
<template>
  <div class="sticky z-20 bg-white border-b border-slate-100"
       :style="{ top: '48px' }">
    <div class="flex items-center gap-6 px-4 h-10 overflow-x-auto scrollbar-hide">
      <button
        v-for="tab in tabs" :key="tab.key"
        class="relative flex-shrink-0 h-full flex items-center transition-colors duration-150"
        :class="[
          activeTab === tab.key
            ? 'text-primary font-semibold text-[15px]'
            : 'text-slate-500 text-[14px] hover:text-slate-700'
        ]"
        @click="$emit('change', tab.key)"
      >
        {{ tab.label }}
        <!-- 选中态底部下划线 -->
        <span
          v-if="activeTab === tab.key"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
        />
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  activeTab: { type: String, default: 'recommend' }
})

defineEmits(['change'])

const tabs = [
  { key: 'recommend', label: '推荐' },
  { key: 'popular', label: '热门' },
  { key: 'template', label: '模板' },
  { key: 'works', label: '作品' },
  { key: 'tutorial', label: '教程' },
  { key: 'activity', label: '活动' }
]
</script>
