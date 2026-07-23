<!-- ============================================
  SearchView.vue — 搜索页
============================================ -->
<template>
  <div class="overflow-y-auto h-full p-5">
    <div class="max-w-[400px] mx-auto mb-5 relative">
      <input
        v-model="query"
        type="text"
        placeholder="搜索公开图纸..."
        class="w-full h-[42px] border border-slate-200 rounded-full pl-5 pr-12 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
        @input="onInput"
      />
      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">🔍</span>
    </div>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 max-w-[1200px] mx-auto">
      <DesignCard
        v-for="d in results"
        :key="d.id"
        :design="d"
        :author-name="d.author?.nickname || d.author?.username || '匿名'"
      />
    </div>

    <div v-if="!query" class="text-center py-16 text-slate-400">输入关键词搜索图纸</div>
    <div v-else-if="results.length === 0 && !loading" class="text-center py-16 text-slate-400">
      未找到 "{{ query }}" 相关图纸
    </div>
    <div v-if="loading" class="text-center py-8 text-slate-400 text-sm">搜索中...</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import API from '@/api/index.js'
import DesignCard from '@/components/DesignCard.vue'

const query = ref('')
const results = ref([])
const loading = ref(false)
let timer = null

function onInput() {
  clearTimeout(timer)
  timer = setTimeout(search, 300)
}

async function search() {
  const q = query.value.trim()
  if (!q) {
    results.value = []
    return
  }
  loading.value = true
  try {
    const res = await API.get('/api/search?q=' + encodeURIComponent(q), false)
    results.value = res.data.list || []
  } catch {
    /* 搜索失败静默处理 */
  } finally {
    loading.value = false
  }
}
</script>
