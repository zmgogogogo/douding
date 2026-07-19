// ============================================
//  useChart — ECharts 图表封装
//  统一管理图表实例生命周期 + 暗色模式 + 响应式
// ============================================
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

// 亮色/暗色主题文本色
function textColor(dark) { return dark ? '#94a3b8' : '#64748b' }
function borderColor(dark) { return dark ? '#1e293b' : '#e2e8f0' }

/**
 * 初始化并管理 ECharts 图表实例
 * @param {string|HTMLDivElement} container — 图表容器或 DOM ID
 * @param {object} [options] — 初始配置（watchSource 用于监听数据变化）
 * @returns {{ chartInstance, setOption, resize, dispose }}
 */
export function useChart(container, options = {}) {
  const chartInstance = ref(null)

  onMounted(() => {
    const el = typeof container === 'string'
      ? document.getElementById(container)
      : container

    if (!el) {
      console.warn('useChart: 容器未找到', container)
      return
    }

    const instance = echarts.init(el)
    chartInstance.value = instance

    if (options.option) {
      instance.setOption(options.option)
    }

    // 响应式 resize
    const ro = new ResizeObserver(() => instance.resize())
    ro.observe(el)

    onUnmounted(() => {
      ro.disconnect()
      instance.dispose()
    })
  })

  // 若传入 watchSource，自动监听变化
  if (options.watchSource) {
    watch(options.watchSource, (newVal) => {
      if (chartInstance.value) {
        chartInstance.value.setOption(typeof options.getOption === 'function'
          ? options.getOption(newVal)
          : newVal, true)
      }
    }, { deep: true })
  }

  /** 设置/更新图表配置 */
  function setOption(option, notMerge = true) {
    chartInstance.value?.setOption(option, notMerge)
  }

  /** 手动触发 resize */
  function resize() {
    chartInstance.value?.resize()
  }

  /** 销毁实例 */
  function dispose() {
    chartInstance.value?.dispose()
    chartInstance.value = null
  }

  return { chartInstance, setOption, resize, dispose }
}

// ============================================
//  预设图表配置工厂函数
// ============================================

/**
 * 消耗趋势折线图配置
 * @param {Array} data — [{ date, inbound, outbound }, ...]
 * @param {boolean} dark — 是否暗色模式
 */
export function makeTrendOption(data, dark = false) {
  return {
    tooltip: { trigger: 'axis' },
    legend: {
      bottom: 0,
      textStyle: { color: textColor(dark), fontSize: 11 }
    },
    grid: { left: 10, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date),
      axisLine: { lineStyle: { color: borderColor(dark) } },
      axisLabel: { color: textColor(dark), fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: borderColor(dark) } },
      axisLabel: { color: textColor(dark), fontSize: 10 }
    },
    series: [
      {
        name: '入库',
        type: 'line',
        data: data.map(d => d.inbound || 0),
        smooth: true,
        lineStyle: { color: '#22c55e', width: 2 },
        itemStyle: { color: '#22c55e' },
        symbol: 'circle',
        symbolSize: 4
      },
      {
        name: '消耗',
        type: 'line',
        data: data.map(d => d.outbound || 0),
        smooth: true,
        lineStyle: { color: '#ef4444', width: 2 },
        itemStyle: { color: '#ef4444' },
        symbol: 'circle',
        symbolSize: 4
      }
    ]
  }
}

/**
 * 颜色消耗排行横向柱状图
 * @param {Array} data — [{ name, total }, ...]
 * @param {boolean} dark — 是否暗色模式
 */
export function makeRankOption(data, dark = false) {
  const sorted = [...data].sort((a, b) => a.total - b.total)
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 10, right: 30, top: 10, bottom: 10 },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: borderColor(dark) } },
      axisLabel: { color: textColor(dark), fontSize: 10 }
    },
    yAxis: {
      type: 'category',
      data: sorted.map(d => d.name),
      axisLabel: { color: textColor(dark), fontSize: 10 },
      inverse: true
    },
    series: [{
      type: 'bar',
      data: sorted.map(d => ({
        value: d.total,
        itemStyle: { color: d.hex || '#3b82f6' }
      })),
      barWidth: 12,
      itemStyle: { borderRadius: [0, 4, 4, 0] }
    }]
  }
}

/**
 * 色系占比饼图
 * @param {Array} data — [{ name, value }, ...]
 * @param {boolean} dark — 是否暗色模式
 */
export function makePieOption(data, dark = false) {
  return {
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      textStyle: { color: textColor(dark), fontSize: 10 }
    },
    series: [{
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['50%', '45%'],
      data: data.map(d => ({
        ...d,
        itemStyle: { borderRadius: 3, borderColor: dark ? '#0f172a' : '#fff', borderWidth: 2 }
      })),
      label: {
        show: true,
        formatter: '{b}\n{d}%',
        fontSize: 10,
        color: textColor(dark)
      },
      emphasis: {
        label: { fontSize: 14, fontWeight: 'bold' }
      }
    }]
  }
}
