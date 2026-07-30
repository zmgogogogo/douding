<!-- ============================================
  MakeRecordsView.vue — 我的制作记录页面
  展示历史制作记录，继续未完成的制作
  ============================================ -->
<template>
  <div class="overflow-y-auto h-full bg-slate-50">
    <div class="max-w-[680px] mx-auto p-4">
      <!-- 头部 -->
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-lg font-bold text-slate-800">我的制作</h1>
        <button
          class="text-xs text-primary font-medium"
          @click="$router.push('/make-records')"
        >
          制作统计
        </button>
      </div>

      <!-- 统计卡片 -->
      <div class="grid grid-cols-3 gap-3 mb-5">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalMakes || 0 }}</div>
          <div class="stat-label">完成次数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalDesigns || 0 }}</div>
          <div class="stat-label">不同图纸</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatDuration(stats.totalDuration) }}</div>
          <div class="stat-label">累计时长</div>
        </div>
      </div>

      <!-- 记录列表 -->
      <div v-if="loading" class="text-center py-10 text-slate-400 text-sm">加载中...</div>

      <div v-else-if="records.length === 0" class="text-center py-14">
        <div class="text-4xl mb-3">🔨</div>
        <p class="text-slate-400 text-sm">还没有制作记录</p>
        <p class="text-slate-300 text-xs mt-1">去详情页点击「开始制作」吧</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="rec in records"
          :key="rec.id"
          class="record-card"
          @click="goDetail(rec.designId)"
        >
          <!-- 缩略图 -->
          <div class="record-thumb">
            <canvas ref="thumbCanvases" class="w-full h-full" />
          </div>

          <!-- 信息 -->
          <div class="record-info">
            <h3 class="record-title">{{ rec.designTitle || '未命名' }}</h3>
            <div class="record-meta">
              <span>{{ rec.gridWidth }}×{{ rec.gridHeight }}</span>
              <span>{{ rec.beadCount }}颗</span>
              <span>{{ rec.colorCount }}色</span>
            </div>
            <div class="record-time">
              <span>耗时 {{ formatDuration(rec.totalDuration) }}</span>
              <span class="record-date">{{ formatDate(rec.finishedAt || rec.updated_at) }}</span>
            </div>
          </div>

          <!-- 操作 -->
          <div class="record-action">
            <button
              class="record-btn"
              @click.stop="$router.push('/make/' + rec.designId)"
            >
              继续
            </button>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="flex justify-center gap-2 py-4">
          <button
            :disabled="page <= 1"
            class="px-3 py-1.5 rounded-lg text-xs border border-slate-200 disabled:opacity-30"
            @click="changePage(page - 1)"
          >
            上一页
          </button>
          <span class="text-xs text-slate-400 py-1.5">{{ page }}/{{ totalPages }}</span>
          <button
            :disabled="page >= totalPages"
            class="px-3 py-1.5 rounded-lg text-xs border border-slate-200 disabled:opacity-30"
            @click="changePage(page + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import API from '@/api/index.js'
import { CanvasRenderer } from '@/utils/canvas.js'

const router = useRouter()

const loading = ref(true)
const records = ref([])
const stats = ref({})
const page = ref(1)
const totalPages = ref(1)
const thumbCanvases = ref([])

onMounted(async () => {
  await fetchRecords()
  await fetchStats()
})

async function fetchRecords() {
  try {
    const res = await API.get(`/api/make/records?page=${page.value}&limit=20`)
    records.value = res.data?.list || []
    totalPages.value = Math.ceil((res.data?.total || 0) / 20)
  } catch {
    records.value = []
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const res = await API.get('/api/make/stats/summary')
    if (res.data) stats.value = res.data
  } catch { /* ignore */ }
}

function changePage(p) {
  page.value = p
  fetchRecords()
}

function goDetail(id) {
  router.push('/detail/' + id)
}

function formatDuration(sec) {
  if (!sec) return '0秒'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}时${m}分`
  if (m > 0) return `${m}分`
  return `${sec}秒`
}

function formatDate(str) {
  if (!str) return ''
  try {
    const d = new Date(str)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch { return '' }
}
</script>

<style scoped>
.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 14px 10px;
  text-align: center;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.stat-value {
  font-size: 20px;
  font-weight: 800;
  color: #1e293b;
  font-family: monospace;
}
.stat-label {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.record-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
  cursor: pointer;
  transition: all 0.15s;
}
.record-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.record-thumb {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  overflow: hidden;
  background: #f8fafc;
  flex-shrink: 0;
}

.record-info {
  flex: 1;
  min-width: 0;
}

.record-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.record-time {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.record-date {
  color: #cbd5e1;
}

.record-action {
  flex-shrink: 0;
}

.record-btn {
  padding: 6px 14px;
  border-radius: 16px;
  border: 1px solid #2563eb;
  background: #fff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
</style>
