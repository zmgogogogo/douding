<!-- ============================================
  MakeColorPanel.vue — 全色色板弹出面板
  底部上滑展开，显示所有颜色、搜索、排序、豆仓联动
  ============================================ -->
<template>
  <Transition name="panel-slide">
    <div v-if="visible" class="color-panel-overlay" @click.self="$emit('close')">
      <div class="color-panel">
        <!-- 拖拽手柄 -->
        <div class="color-panel-handle" />

        <!-- 标题栏 -->
        <div class="color-panel-header">
          <h3 class="color-panel-title">
            全部颜色 · {{ filteredColors.length }}{{ colors.length !== filteredColors.length ? `/${colors.length}` : '' }}
          </h3>
          <button class="color-panel-close" @click="$emit('close')">✕</button>
        </div>

        <!-- 工具栏 -->
        <div class="color-panel-tools">
          <input
            v-model="searchText"
            class="color-panel-search"
            placeholder="搜索色号/名称..."
            type="text"
          />
          <select v-model="sortMode" class="color-panel-sort">
            <option value="count-desc">用量 ↓</option>
            <option value="count-asc">用量 ↑</option>
            <option value="name">名称 A-Z</option>
            <option value="hue">色相</option>
          </select>
        </div>

        <!-- 颜色列表 -->
        <div class="color-panel-list" ref="listRef">
          <button
            v-for="color in filteredColors"
            :key="color.hex"
            class="color-panel-item"
            :class="{
              current: color.hex.toUpperCase() === currentHex?.toUpperCase(),
              done: isColorDone(color.hex),
            }"
            @click="$emit('select', color)"
          >
            <!-- 色块 -->
            <div
              class="color-panel-swatch"
              :style="{ background: color.hex }"
            >
              <CheckCircleIcon v-if="isColorDone(color.hex)" :size="14" class="swatch-check" />
            </div>

            <!-- 信息 -->
            <div class="color-panel-info">
              <div class="color-panel-name-row">
                <span class="color-panel-name">{{ color.name }}</span>
                <span class="color-panel-code">{{ color.hex }}</span>
              </div>
              <div class="color-panel-meta">
                <span>{{ color.count }} 颗</span>
                <span v-if="getInventory(color.hex) !== null" class="color-panel-inventory">
                  库存 {{ getInventory(color.hex) }}
                </span>
              </div>
            </div>

            <!-- 箭头 -->
            <ChevronRightIcon :size="16" class="color-panel-arrow" />
          </button>
        </div>

        <!-- 底部统计 -->
        <div class="color-panel-footer">
          <div class="color-panel-footer-item">
            <span class="color-panel-footer-label">颜色</span>
            <span class="color-panel-footer-value">{{ colors.length }}</span>
          </div>
          <div class="color-panel-footer-item">
            <span class="color-panel-footer-label">已完成</span>
            <span class="color-panel-footer-value text-emerald-500">{{ finishedCount }}</span>
          </div>
          <div class="color-panel-footer-item">
            <span class="color-panel-footer-label">总颗数</span>
            <span class="color-panel-footer-value">{{ totalBeads }}</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CheckCircleIcon, ChevronRightIcon } from 'lucide-vue-next'

const props = defineProps({
  visible: { type: Boolean, default: false },
  colors: { type: Array, default: () => [] },
  currentHex: { type: String, default: null },
  finishedHexes: { type: Set, default: () => new Set() },
  inventoryMap: { type: Map, default: () => new Map() }, // hex → quantity
})

defineEmits(['close', 'select'])

const searchText = ref('')
const sortMode = ref('count-desc')
const listRef = ref(null)

const finishedCount = computed(() => props.finishedHexes?.size || 0)

const totalBeads = computed(() =>
  props.colors.reduce((sum, c) => sum + c.count, 0)
)

const filteredColors = computed(() => {
  let list = [...props.colors]

  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.hex || '').toLowerCase().includes(q)
    )
  }

  switch (sortMode.value) {
    case 'count-asc':
      list.sort((a, b) => a.count - b.count)
      break
    case 'name':
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      break
    case 'hue':
      list.sort((a, b) => hueCompare(a.hex, b.hex))
      break
    case 'count-desc':
    default:
      list.sort((a, b) => b.count - a.count)
      break
  }

  return list
})

function isColorDone(hex) {
  return props.finishedHexes?.has(hex.toUpperCase())
}

function getInventory(hex) {
  return props.inventoryMap?.get(hex.toUpperCase()) ?? null
}

function hueCompare(hex1, hex2) {
  const h1 = simpleHue(hex1)
  const h2 = simpleHue(hex2)
  return h1 - h2
}

function simpleHue(hex) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return h * 360
}
</script>

<style scoped>
.color-panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.color-panel {
  width: 100%;
  max-width: 480px;
  max-height: 70vh;
  background: #fff;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.color-panel-handle {
  width: 36px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  margin: 10px auto 6px;
}

.color-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 10px;
}

.color-panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.color-panel-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.color-panel-tools {
  display: flex;
  gap: 8px;
  padding: 0 16px 8px;
}

.color-panel-search {
  flex: 1;
  height: 32px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  padding: 0 10px;
  font-size: 12px;
  color: #475569;
  background: #f8fafc;
}

.color-panel-sort {
  height: 32px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  padding: 0 6px;
  font-size: 11px;
  color: #64748b;
  background: #f8fafc;
}

.color-panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.color-panel-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 8px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 12px;
  transition: background 0.12s;
  text-align: left;
}
.color-panel-item:hover {
  background: #f8fafc;
}
.color-panel-item.current {
  background: #eff6ff;
  box-shadow: inset 0 0 0 1.5px #3b82f6;
}
.color-panel-item.done {
  opacity: 0.55;
}

.color-panel-swatch {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 2px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swatch-check {
  color: #10b981;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
}

.color-panel-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.color-panel-name-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.color-panel-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.color-panel-code {
  font-size: 10px;
  color: #94a3b8;
  font-family: monospace;
}

.color-panel-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: #94a3b8;
}

.color-panel-inventory {
  color: #f59e0b;
}

.color-panel-arrow {
  color: #cbd5e1;
  flex-shrink: 0;
}

.color-panel-footer {
  display: flex;
  border-top: 1px solid #f1f5f9;
  padding: 10px 0;
}

.color-panel-footer-item {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.color-panel-footer-label {
  font-size: 10px;
  color: #94a3b8;
}

.color-panel-footer-value {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

/* 过渡动画 */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.25s ease;
}
.panel-slide-enter-active .color-panel,
.panel-slide-leave-active .color-panel {
  transition: transform 0.25s ease;
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
}
.panel-slide-enter-from .color-panel,
.panel-slide-leave-to .color-panel {
  transform: translateY(100%);
}
</style>
