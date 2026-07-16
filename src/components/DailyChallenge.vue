<!-- 每日挑战卡片 — 首页展示 -->
<template>
  <div v-if="challenge" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-lg">🎯</span>
      <h3 class="font-semibold text-slate-800">今日挑战</h3>
      <span class="text-[11px] text-slate-400 ml-auto">{{ challenge.date }}</span>
    </div>
    <p class="text-xl font-bold text-primary mb-2">{{ challenge.zh }}</p>
    <p class="text-sm text-slate-500 mb-4">{{ challenge.en }}</p>
    <div class="flex items-center gap-3">
      <router-link to="/editor" class="btn-primary text-sm px-4 py-2 rounded-full">
        开始创作
      </router-link>
      <span class="text-xs text-slate-400">{{ challenge.submissionCount || 0 }} 人已投稿</span>
    </div>
    <!-- 未来挑战预览 -->
    <div v-if="upcoming?.length" class="mt-4 pt-4 border-t border-slate-100">
      <p class="text-[11px] text-slate-400 mb-2">即将到来</p>
      <div class="flex flex-wrap gap-2">
        <span v-for="u in upcoming.slice(0, 5)" :key="u.date"
          class="text-[10px] px-2 py-1 bg-slate-50 rounded-full text-slate-500">
          {{ u.date.slice(5) }} {{ u.zh }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import API from '../api/index.js'

const challenge = ref(null)
const upcoming = ref(null)

onMounted(async () => {
  try {
    const [todayRes, upcomingRes] = await Promise.all([
      API.get('/api/challenge/today'),
      API.get('/api/challenges/upcoming')
    ])
    if (todayRes.code === 200) challenge.value = todayRes.data
    if (upcomingRes.code === 200) upcoming.value = upcomingRes.data
  } catch {}
})
</script>
