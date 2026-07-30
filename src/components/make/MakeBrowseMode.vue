<!-- ============================================
  MakeBrowseMode.vue — 全局浏览模式
  全色显示整张图纸，点击色板单一/多色高亮，手动标记完成
  ============================================ -->
<template>
  <div class="browse-overlay">
    <!-- 右侧色板列表 -->
    <div class="browse-palette" :class="{ open: paletteOpen }">
      <button class="browse-palette-toggle" @click="paletteOpen = !paletteOpen">
        <PaletteIcon :size="18" />
        <span v-if="paletteOpen">收起色板</span>
      </button>

      <div v-if="paletteOpen" class="browse-palette-body">
        <!-- 搜索 + 排序 -->
        <div class="browse-palette-tools">
          <input
            v-model="searchText"
            class="browse-palette-search"
            placeholder="搜索颜色..."
            type="text"
          />
          <select v-model="sortMode" class="browse-palette-sort">
            <option value="count-desc">用量↓</option>
            <option value="count-asc">用量↑</option>
            <option value="name">名称</option>
            <option value="hue">色相</option>
          </select>
        </div>

        <!-- 颜色列表 -->
        <div class="browse-palette-list">
          <button
            v-for="color in filteredColors"
            :key="color.hex"
            class="browse-palette-item"
            :class="{
              active: highlightedHexes.has(color.hex.toUpperCase()),
              done: finishedHexes.has(color.hex.toUpperCase()),
            }"
            @click="toggleHighlight(color)"
            @contextmenu.prevent="toggleFinished(color)"
          >
            <div
              class="browse-palette-swatch"
              :style="{ background: color.hex }"
            >
              <CheckIcon v-if="finishedHexes.has(color.hex.toUpperCase())" :size="12" />
            </div>
            <div class="browse-palette-info">
              <span class="browse-palette-name">{{ color.name }}</span>
              <span class="browse-palette-count">{{ color.count }}</span>
            </div>
          </button>
        </div>

        <!-- 底部统计 -->
        <div class="browse-palette-footer">
          <span>{{ finishedHexes.size }}/{{ colors.length }} 色已完成</span>
          <button class="browse-palette-clear" @click="clearAll">
            清除高亮
          </button>
        </div>
      </div>
    </div>

    <!-- 模式标签 -->
    <div class="browse-mode-badge">
      👁 全局浏览 · {{ finishedHexes.size }}/{{ colors.length }} 色完成
      <button class="browse-mode-exit" @click="$emit('exitBrowse')">
        切换分步模式
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { PaletteIcon, CheckIcon } from 'lucide-vue-next'

const props = defineProps({
  colors: { type: Array, default: () => [] },        // [{hex, name, count}]
  finishedHexes: { type: Set, default: () => new Set() },
  highlightedHexes: { type: Set, default: () => new Set() },
})

const emit = defineEmits(['toggleHighlight', 'toggleFinished', 'clearHighlight', 'exitBrowse'])

const paletteOpen = ref(true)
const searchText = ref('')
const sortMode = ref('count-desc')

// 过滤 + 排序
const filteredColors = computed(() => {
  let list = [...props.colors]

  // 搜索过滤
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.hex || '').toLowerCase().includes(q)
    )
  }

  // 排序
  switch (sortMode.value) {
    case 'count-asc':
      list.sort((a, b) => a.count - b.count)
      break
    case 'name':
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      break
    case 'hue':
      list.sort((a, b) => hexToHue(a.hex) - hexToHue(b.hex))
      break
    case 'count-desc':
    default:
      list.sort((a, b) => b.count - a.count)
      break
  }

  return list
})

function toggleHighlight(color) {
  emit('toggleHighlight', color.hex)
}

function toggleFinished(color) {
  emit('toggleFinished', color.hex)
}

function clearAll() {
  emit('clearHighlight')
}

function hexToHue(hex) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  if (max === min) return 0
  let h = 0
  const d = max - min
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return h * 360
}
</script>

<style scoped>
.browse-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 25;
}
.browse-overlay > * {
  pointer-events: auto;
}

.browse-palette {
  position: absolute;
  right: 8px;
  top: 8px;
  bottom: 80px;
  width: 200px;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  transition: all 0.25s ease;
  z-index: 5;
}
.browse-palette:not(.open) {
  width: auto;
}

.browse-palette-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  align-self: flex-end;
}

.browse-palette-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.browse-palette-tools {
  display: flex;
  gap: 6px;
  padding: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.browse-palette-search {
  flex: 1;
  min-width: 0;
  height: 28px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 0 8px;
  font-size: 11px;
  color: #475569;
  background: #f8fafc;
}

.browse-palette-sort {
  width: 60px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 10px;
  color: #64748b;
  background: #f8fafc;
}

.browse-palette-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.browse-palette-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.1s;
  text-align: left;
}
.browse-palette-item:hover {
  background: #f1f5f9;
}
.browse-palette-item.active {
  background: #eff6ff;
  box-shadow: inset 0 0 0 1px #93c5fd;
}
.browse-palette-item.done {
  opacity: 0.5;
}

.browse-palette-swatch {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.browse-palette-info {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.browse-palette-name {
  font-size: 11px;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.browse-palette-count {
  font-size: 10px;
  color: #94a3b8;
  flex-shrink: 0;
}

.browse-palette-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-top: 1px solid #f1f5f9;
  font-size: 11px;
  color: #64748b;
}

.browse-palette-clear {
  font-size: 11px;
  color: #ef4444;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.browse-mode-badge {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  background: rgba(30, 41, 59, 0.85);
  backdrop-filter: blur(8px);
  color: #e2e8f0;
  font-size: 11px;
  border-radius: 20px;
}

.browse-mode-exit {
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  font-size: 11px;
  cursor: pointer;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .browse-palette {
    right: 4px;
    top: 4px;
    bottom: 70px;
    width: 170px;
  }
  .browse-mode-badge {
    bottom: 4px;
    font-size: 10px;
    padding: 4px 10px;
  }
}
</style>
