<!-- ============================================
  MakeCoordDisplay.vue — 网格坐标显示
  画布区域左上角实时显示当前触摸位置的 (列, 行)
  ============================================ -->
<template>
  <div class="coord-display" v-if="col !== null && row !== null">
    <span class="coord-label">列</span>
    <span class="coord-value">{{ displayCol }}</span>
    <span class="coord-sep">·</span>
    <span class="coord-label">行</span>
    <span class="coord-value">{{ displayRow }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  col: { type: Number, default: null },
  row: { type: Number, default: null },
  gridW: { type: Number, default: 58 },
})

const displayCol = computed(() => props.col !== null ? props.col + 1 : '—')
const displayRow = computed(() => props.row !== null ? props.row + 1 : '—')
</script>

<style scoped>
.coord-display {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: rgba(30, 41, 59, 0.78);
  backdrop-filter: blur(8px);
  border-radius: 10px;
  font-family: monospace;
  pointer-events: none;
}

.coord-label {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 500;
}

.coord-value {
  font-size: 13px;
  color: #e2e8f0;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
}

.coord-sep {
  color: #475569;
  font-size: 10px;
}
</style>
