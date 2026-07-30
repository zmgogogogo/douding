<!-- 占位视图 — 功能待实现 -->
<template>
  <div class="page-container">
    <h2 class="page-title">{{ title }}</h2>
    <el-card>
      <div class="text-center text-slate-400 py-16">
        <el-icon :size="48"><component :is="LoadingIcon" /></el-icon>
        <p class="mt-4">此功能正在开发中...</p>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { Loading } from '@element-plus/icons-vue'
const LoadingIcon = Loading
defineProps({ title: { type: String, default: '页面' } })
</script>

<style scoped>
.page-container { max-width: 1400px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
</style>
