<!-- ============================================
  DashboardView.vue — 数据看板
============================================ -->
<template>
  <div class="page-container">
    <h2 class="page-title">📊 数据看板</h2>

    <!-- KPI 卡片 -->
    <el-row :gutter="16" class="kpi-row">
      <el-col :span="6" v-for="card in statCards" :key="card.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-value" :style="{ color: card.color || '#1a1a1a' }">{{ card.value }}</div>
          <div class="stat-sub" v-if="card.trend !== undefined">
            <span :class="card.trend >= 0 ? 'trend-up' : 'trend-down'">
              {{ card.trend >= 0 ? '↑' : '↓' }} {{ Math.abs(card.trend) }}
            </span>
            <span class="trend-label"> 较昨日</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区 -->
    <el-row :gutter="16" class="mt-4">
      <!-- 用户趋势 -->
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="chart-header">
              <span>用户 & 作品增长趋势</span>
              <el-radio-group v-model="trendDays" size="small" @change="loadTrends">
                <el-radio-button :value="7">近7天</el-radio-button>
                <el-radio-button :value="30">近30天</el-radio-button>
                <el-radio-button :value="90">近90天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-box"></div>
        </el-card>
      </el-col>

      <!-- 品牌分布 -->
      <el-col :span="8">
        <el-card>
          <template #header>品牌分布</template>
          <div ref="brandChartRef" class="chart-box"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt-4">
      <!-- 内容状态 -->
      <el-col :span="8">
        <el-card>
          <template #header>内容状态分布</template>
          <div ref="contentChartRef" class="chart-box-small"></div>
        </el-card>
      </el-col>

      <!-- 热门设计 -->
      <el-col :span="16">
        <el-card>
          <template #header>热门设计 Top10</template>
          <el-table :data="topDesigns" size="small" max-height="280">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
            <el-table-column prop="likes_count" label="点赞" width="80" align="center" />
            <el-table-column prop="views_count" label="浏览" width="80" align="center" />
            <el-table-column prop="bead_count" label="豆子数" width="80" align="center" />
            <el-table-column prop="color_count" label="颜色数" width="80" align="center" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import adminAPI from '@/api/admin.js'

const statCards = ref([
  { label: '总用户数', value: '--' },
  { label: '总作品数', value: '--' },
  { label: '今日新增用户', value: '--', trend: undefined },
  { label: '今日新增作品', value: '--', trend: undefined },
  { label: '7日活跃用户', value: '--' },
  { label: 'VIP用户', value: '--' },
  { label: '珠子颜色数', value: '--' },
  { label: 'Banner数', value: '--' },
])

const topDesigns = ref([])
const trendDays = ref(30)

// 图表引用
const trendChartRef = ref(null)
const brandChartRef = ref(null)
const contentChartRef = ref(null)
let trendChart = null
let brandChart = null
let contentChart = null

async function loadStats() {
  try {
    const res = await adminAPI.get('/api/admin/dashboard/stats')
    const s = res.data
    statCards.value = [
      { label: '总用户数', value: s.totalUsers ?? '--' },
      { label: '总作品数', value: s.totalDesigns ?? '--' },
      {
        label: '今日新增用户', value: s.todayNewUsers ?? '--',
        trend: s.yesterdayNewUsers !== 0 ? s.todayNewUsers - s.yesterdayNewUsers : undefined,
      },
      {
        label: '今日新增作品', value: s.todayNewDesigns ?? '--',
        trend: s.yesterdayNewDesigns !== 0 ? s.todayNewDesigns - s.yesterdayNewDesigns : undefined,
      },
      { label: '7日活跃用户', value: s.weekActiveUsers ?? '--' },
      { label: 'VIP用户', value: s.vipUsers ?? '--' },
      { label: '珠子颜色数', value: s.colorCount ?? '--' },
      { label: 'Banner数', value: s.bannerCount ?? '--' },
    ]
  } catch (err) {
    console.error('加载统计数据失败', err)
  }
}

async function loadTrends() {
  try {
    const res = await adminAPI.get(`/api/admin/dashboard/trends?days=${trendDays.value}`)
    renderTrendChart(res.data)
  } catch (err) {
    console.error('加载趋势数据失败', err)
  }
}

async function loadBrandDistribution() {
  try {
    const res = await adminAPI.get('/api/admin/dashboard/brand-distribution')
    renderBrandChart(res.data)
  } catch (err) {
    console.error('加载品牌分布失败', err)
  }
}

async function loadContentStatus() {
  try {
    const res = await adminAPI.get('/api/admin/dashboard/content-status')
    renderContentChart(res.data)
  } catch (err) {
    console.error('加载内容状态失败', err)
  }
}

async function loadTopDesigns() {
  try {
    const res = await adminAPI.get('/api/admin/dashboard/top-designs?limit=10')
    topDesigns.value = res.data || []
  } catch (err) {
    console.error('加载热门设计失败', err)
  }
}

// ===== ECharts 渲染 =====

function renderTrendChart(data) {
  if (!trendChartRef.value) return
  if (!trendChart) trendChart = echarts.init(trendChartRef.value)

  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增用户', '新增作品'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: (data.users || []).map((d) => d.date),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '新增用户',
        type: 'line',
        smooth: true,
        data: (data.users || []).map((d) => d.count),
        itemStyle: { color: '#409eff' },
        areaStyle: { color: 'rgba(64,158,255,0.1)' },
      },
      {
        name: '新增作品',
        type: 'line',
        smooth: true,
        data: (data.designs || []).map((d) => d.count),
        itemStyle: { color: '#67c23a' },
        areaStyle: { color: 'rgba(103,194,58,0.1)' },
      },
    ],
  }, true)
}

function renderBrandChart(data) {
  if (!brandChartRef.value) return
  if (!brandChart) brandChart = echarts.init(brandChartRef.value)

  brandChart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      data: (data || []).map((d) => ({ name: d.brand, value: d.count })),
      label: { formatter: '{b}\n{d}%' },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' },
      },
    }],
  }, true)
}

function renderContentChart(data) {
  if (!contentChartRef.value) return
  if (!contentChart) contentChart = echarts.init(contentChartRef.value)

  contentChart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: '70%',
      center: ['50%', '55%'],
      data: [
        { name: '公开作品', value: data?.published ?? 0, itemStyle: { color: '#67c23a' } },
        { name: '私有作品', value: data?.private ?? 0, itemStyle: { color: '#909399' } },
      ],
      label: { formatter: '{b}\n{d}%' },
    }],
  }, true)
}

// 响应式
function handleResize() {
  trendChart?.resize()
  brandChart?.resize()
  contentChart?.resize()
}

onMounted(async () => {
  await Promise.all([loadStats(), loadTrends(), loadBrandDistribution(), loadContentStatus(), loadTopDesigns()])
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  brandChart?.dispose()
  contentChart?.dispose()
})
</script>

<style scoped>
.page-container { max-width: 1400px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }

.stat-card { border-radius: 12px; cursor: default; }
.stat-label { font-size: 13px; color: #999; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 700; }
.stat-sub { font-size: 12px; margin-top: 4px; }
.trend-up { color: #67c23a; }
.trend-down { color: #f56c6c; }
.trend-label { color: #999; }

.chart-header {
  display: flex; justify-content: space-between; align-items: center;
}
.chart-box { width: 100%; height: 360px; }
.chart-box-small { width: 100%; height: 280px; }

.mt-4 { margin-top: 16px; }
</style>
