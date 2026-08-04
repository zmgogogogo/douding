<!-- ============================================
  ColorCardGrid.vue — 豆仓色号卡片网格（V3.0）
  接收 props 驱动的纯展示组件，对接 /api/stock/* 数据格式
  4态卡片：充足/紧张/缺货/未拥有 + 长按连续加减
  ============================================ -->
<template>
  <div>
    <!-- 加载中 -->
    <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400 text-sm">
      加载中…
    </div>

    <!-- 空状态（可自定义） -->
    <div v-else-if="!items.length && emptyText" class="text-center py-16">
      <div class="text-5xl mb-3">{{ emptyIcon }}</div>
      <p class="text-sm font-medium text-slate-500 mb-1">{{ emptyText }}</p>
      <p v-if="emptySubText" class="text-xs text-slate-400">{{ emptySubText }}</p>
    </div>

    <!-- 2列自适应网格 -->
    <div v-else class="grid grid-cols-2 gap-3">
      <div
        v-for="item in items"
        :key="item.colorId"
        class="bead-card"
        :class="{ 'card-unowned': item.status === 'unowned' }"
        @click="$emit('select', item)"
      >
        <!-- 色块区域 -->
        <div
          class="card-swatch"
          :class="{ 'swatch-unowned': item.status === 'unowned' }"
          :style="{ background: item.colorHex }"
        >

          <!-- hover +/- 快捷操作 -->
          <div class="card-swatch-actions">
            <button
              v-if="item.status !== 'unowned'"
              class="swatch-btn"
              :disabled="item.stockNum <= 0"
              @mousedown.stop="startContinuous(item, -1)"
              @mouseup.stop="stopContinuous"
              @mouseleave.stop="stopContinuous"
              @touchstart.stop.prevent="startContinuous(item, -1)"
              @touchend.stop.prevent="stopContinuous"
              @touchcancel.stop="stopContinuous"
            >−</button>
            <button
              class="swatch-btn"
              @mousedown.stop="startContinuous(item, 1)"
              @mouseup.stop="stopContinuous"
              @mouseleave.stop="stopContinuous"
              @touchstart.stop.prevent="startContinuous(item, 1)"
              @touchend.stop.prevent="stopContinuous"
              @touchcancel.stop="stopContinuous"
            >+</button>
          </div>
        </div>

        <!-- 信息区域 -->
        <div class="card-info">
          <div class="flex items-center gap-1 mb-0.5">
            <span class="brand-tag">{{ item.brand }}</span>
            <span class="text-[11px] font-bold text-slate-700 truncate flex-1">
              {{ item.colorCode }}
            </span>
          </div>
          <div class="text-[10px] text-slate-400 truncate mb-1.5">{{ item.colorName || item.name }}</div>
          <div class="flex items-center justify-between mt-1">
            <span class="text-xs font-bold" :style="{ color: statusColor(item.status) }">
              {{ item.status === 'unowned' ? '未拥有' : (item.stockNum || 0).toLocaleString() + ' 颗' }}
            </span>
            <span
              class="status-tag"
              :style="statusTagStyle(item.status)"
            >
              {{ statusLabel(item.status) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onUnmounted } from 'vue'

const props = defineProps({
  /** 豆子列表（格式匹配 /api/stock/list 返回） */
  items: { type: Array, default: () => [] },
  /** 是否加载中 */
  loading: { type: Boolean, default: false },
  /** 空状态提示文字 */
  emptyText: { type: String, default: '' },
  /** 空状态副标题 */
  emptySubText: { type: String, default: '' },
  /** 空状态图标 */
  emptyIcon: { type: String, default: '📦' },
})

const emit = defineEmits(['select', 'adjust'])

// ====== 长按连续加减 ======
let longPressTimer = null
let repeatTimer = null

function startContinuous(item, delta) {
  // 未拥有颜色禁止减号
  if (delta < 0 && item.status === 'unowned') return
  // 库存为0禁止减号
  if (delta < 0 && (item.stockNum || 0) <= 0) return

  // 立即执行一次
  emit('adjust', item, delta)

  // 400ms 后开始连续
  longPressTimer = setTimeout(() => {
    repeatTimer = setInterval(() => {
      if (delta < 0 && (item.stockNum || 0) <= 0) {
        stopContinuous()
        return
      }
      emit('adjust', item, delta)
    }, 80)
  }, 400)
}

function stopContinuous() {
  clearTimeout(longPressTimer)
  clearInterval(repeatTimer)
  longPressTimer = null
  repeatTimer = null
}

onUnmounted(() => {
  stopContinuous()
})

// ====== 状态工具 ======
function statusColor(status) {
  const map = { sufficient: '#00b42a', low: '#ff7d00', out: '#f53f3f', unowned: '#cccccc' }
  return map[status] || '#999'
}

function statusLabel(status) {
  const map = { sufficient: '充足', low: '紧张', out: '缺货', unowned: '未拥有' }
  return map[status] || status
}

function statusTagStyle(status) {
  const map = {
    sufficient: { background: '#e8f8ee', color: '#00b42a' },
    low: { background: '#fff3e8', color: '#ff7d00' },
    out: { background: '#ffe8e8', color: '#f53f3f' },
    unowned: { background: '#f1f5f9', color: '#94a3b8' },
  }
  return map[status] || {}
}
</script>

<style scoped>
/* ====== 卡片 ====== */
.bead-card {
  @apply bg-white rounded-xl border border-slate-100 overflow-hidden
         cursor-pointer transition-all duration-150
         hover:shadow-md active:scale-[0.98];
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
}
.bead-card.card-unowned {
  @apply opacity-70;
}

/* 色块 */
.card-swatch {
  @apply h-20 relative flex items-center justify-center ring-1 ring-black/10;
  border-radius: 8px;
  margin: 8px 8px 0 8px;
}
.card-swatch.swatch-unowned {
  @apply opacity-30 border-2 border-dashed border-slate-300;
}
.card-swatch-actions {
  @apply absolute inset-0 flex items-end justify-center pb-1.5 gap-1
         opacity-0 transition-opacity duration-150;
}
.card-swatch:hover .card-swatch-actions,
.card-swatch:active .card-swatch-actions {
  @apply opacity-100;
}
.swatch-btn {
  @apply w-7 h-7 rounded-full bg-white/90 text-xs font-bold text-slate-600
         flex items-center justify-center shadow-sm
         hover:bg-white hover:text-primary transition-colors
         active:scale-90 select-none;
  -webkit-user-select: none;
  user-select: none;
}
.swatch-btn:disabled {
  @apply opacity-30 cursor-not-allowed;
}

/* 信息 */
.card-info {
  @apply px-2.5 py-2;
}

/* 品牌标签 */
.brand-tag {
  @apply text-[9px] px-1 py-0 rounded font-medium bg-slate-100 text-slate-500 flex-shrink-0;
}

/* 状态标签 */
.status-tag {
  @apply text-[10px] px-1.5 py-0.5 rounded font-semibold;
}
</style>
