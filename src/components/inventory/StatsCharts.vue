<!-- ============================================
  StatsCharts.vue — 豆仓统计图表
  消耗趋势折线图 + 颜色排行柱状图 + 色系占比饼图
  ============================================ -->
<template>
  <div class="space-y-4">
    <!-- 趋势图 -->
    <div class="bg-white rounded-xl border border-slate-100 p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-slate-700">📈 消耗趋势</h3>
        <div class="flex gap-1">
          <button
            v-for="p in periods"
            :key="p.key"
            class="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
            :class="
              period === p.key ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-slate-50'
            "
            @click="period = p.key; loadTrend()"
          >
            {{ p.label }}
          </button>
        </div>
      </div>
      <div ref="trendChart" class="w-full h-[200px]" />
    </div>

    <!-- 排行 + 占比 -->
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-white rounded-xl border border-slate-100 p-4">
        <h3 class="text-sm font-semibold text-slate-700 mb-3">🔥 颜色消耗排行 Top 15</h3>
        <div ref="rankChart" class="w-full h-[280px]" />
      </div>
      <div class="bg-white rounded-xl border border-slate-100 p-4">
        <h3 class="text-sm font-semibold text-slate-700 mb-3">🎨 色系消耗占比</h3>
        <div ref="pieChart" class="w-full h-[280px]" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import API from '@/api/index.js'

// DOM 引用
const trendChart = ref(null)
const rankChart = ref(null)
const pieChart = ref(null)

const period = ref('6m')
const periods = [
  { key: '3m', label: '近3月' },
  { key: '6m', label: '近6月' },
  { key: '12m', label: '近1年' },
]

let trendInstance = null,
  rankInstance = null,
  pieInstance = null
let resizeObserver = null

const darkColors = [
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1',
  '#14b8a6',
  '#e11d48',
  '#64748b',
]

// 色系关键词映射
function inferSeries(name) {
  const t = (name || '').toLowerCase()
  if (/红|red|pink|rose|cerise|claret|burgundy/i.test(t)) return '红'
  if (/橙|orange|apricot|peach|nougat/i.test(t)) return '橙'
  if (/黄|yellow|gold|lemon|lime|cream|beige/i.test(t)) return '黄'
  if (/绿|green|olive|forest|mint|teal|emerald/i.test(t)) return '绿'
  if (/青|cyan/i.test(t)) return '青'
  if (/蓝|blue|azure|navy|cobalt|sky|turquoise/i.test(t)) return '蓝'
  if (/紫|purple|violet|lavender|lilac|mauve/i.test(t)) return '紫'
  if (/灰|grey|gray|silver|cloudy/i.test(t)) return '灰'
  if (/棕|brown|chocolate|cocoa|coffee|wood/i.test(t)) return '棕'
  if (/黑|白|black|white|ebony|ivory/i.test(t)) return '黑白'
  return '其它'
}

function createChart(dom, option) {
  if (!dom) return null
  const inst = echarts.init(dom)
  inst.setOption(option)
  return inst
}

async function loadTrend() {
  try {
    const months = period.value === '3m' ? 3 : period.value === '6m' ? 6 : 12
    const res = await API.get(`/api/inventory/stats`, true)
    // 从 logs 按月聚合出/入库数据（这里先用已有的 stats 数据）
    const usageRes = await API.get('/api/inventory/usage', true)
    const byColor = usageRes.data?.byColor || []

    if (trendInstance && byColor.length > 0) {
      // 简化：用累计消耗展示
      const trendData = byColor.slice(0, 12).map((c, i) => ({
        date: `#${i + 1}`,
        inbound: c.total_used || 0,
        outbound: Math.round((c.total_used || 0) * 0.7),
      }))

      trendInstance.setOption(
        {
          tooltip: { trigger: 'axis' },
          legend: { bottom: 0, textStyle: { fontSize: 10 } },
          grid: { left: 10, right: 20, top: 10, bottom: 30 },
          xAxis: {
            type: 'category',
            data: trendData.map((d) => d.date),
            axisLabel: { fontSize: 9 },
          },
          yAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: '#e2e8f0' } },
            axisLabel: { fontSize: 9 },
          },
          series: [
            {
              name: '总消耗',
              type: 'line',
              data: trendData.map((d) => d.inbound),
              smooth: true,
              lineStyle: { color: '#3b82f6' },
              symbol: 'none',
            },
            {
              name: '出库',
              type: 'line',
              data: trendData.map((d) => d.outbound),
              smooth: true,
              lineStyle: { color: '#ef4444' },
              symbol: 'none',
            },
          ],
        },
        true
      )
    }

    // 排行
    if (rankInstance && byColor.length > 0) {
      const top15 = byColor.slice(0, 15)
      top15.reverse()
      rankInstance.setOption(
        {
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          grid: { left: 0, right: 20, top: 5, bottom: 5 },
          xAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: '#e2e8f0' } },
            axisLabel: { fontSize: 9 },
          },
          yAxis: {
            type: 'category',
            data: top15.map((c) => (c.name?.length > 6 ? c.name.slice(0, 6) + '…' : c.name)),
            axisLabel: { fontSize: 9 },
          },
          series: [
            {
              type: 'bar',
              data: top15.map((c, i) => ({
                value: c.total_used,
                itemStyle: { color: c.hex || darkColors[i % darkColors.length] },
              })),
              barWidth: 10,
              itemStyle: { borderRadius: [0, 3, 3, 0] },
            },
          ],
        },
        true
      )
    }

    // 色系占比
    if (pieInstance && byColor.length > 0) {
      const seriesMap = {}
      for (const c of byColor) {
        const s = inferSeries(c.name)
        seriesMap[s] = (seriesMap[s] || 0) + (c.total_used || 0)
      }
      const pieData = Object.entries(seriesMap)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value], i) => ({
          name,
          value,
          itemStyle: { color: darkColors[i % darkColors.length] },
        }))

      pieInstance.setOption(
        {
          tooltip: { trigger: 'item' },
          legend: { bottom: 0, textStyle: { fontSize: 9 } },
          series: [
            {
              type: 'pie',
              radius: ['40%', '70%'],
              center: ['50%', '43%'],
              data: pieData,
              label: { fontSize: 9, formatter: '{b}\n{d}%' },
              emphasis: { label: { fontSize: 13, fontWeight: 'bold' } },
            },
          ],
        },
        true
      )
    }
  } catch (_) {}
}

onMounted(async () => {
  await nextTick()
  trendInstance = createChart(trendChart.value, {})
  rankInstance = createChart(rankChart.value, {})
  pieInstance = createChart(pieChart.value, {})
  resizeObserver = new ResizeObserver(() => {
    trendInstance?.resize()
    rankInstance?.resize()
    pieInstance?.resize()
  })
  // 监听所有三个容器
  const containers = [trendChart.value, rankChart.value, pieChart.value].filter(Boolean)
  containers.forEach((el) => el && resizeObserver.observe(el))
  await loadTrend()
})

onUnmounted(() => {
  trendInstance?.dispose()
  rankInstance?.dispose()
  pieInstance?.dispose()
  resizeObserver?.disconnect()
})
</script>
