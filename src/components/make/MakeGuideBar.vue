<!-- ============================================
  MakeGuideBar.vue — 制作模式底部引导栏 (v2.0)
  支持按颜色/按区域/按图层三种分步模式切换
  ============================================ -->
<template>
  <div class="make-guide-bar">
    <!-- 分步模式指示 -->
    <div class="guide-mode-row">
      <div class="guide-mode-tabs">
        <button
          v-for="m in modes"
          :key="m.key"
          class="guide-mode-tab"
          :class="{ active: stepMode === m.key }"
          @click="$emit('switchMode', m.key)"
        >
          {{ m.label }}
        </button>
      </div>
    </div>

    <div class="guide-main-row">
      <!-- 颜色信息 -->
      <div class="guide-color-info" @click="$emit('openColorPanel')">
        <div
          class="guide-color-swatch"
          :style="{ background: currentStep?.hex || '#64748b' }"
        />
        <div class="guide-color-text">
          <span class="guide-color-name">
            {{ currentStep?.name || currentStep?.label || '—' }}
          </span>
          <span class="guide-color-count">{{ currentStep?.count || 0 }} 颗</span>
        </div>
      </div>

      <!-- 独占模式切换 -->
      <button
        v-if="stepMode === 'color'"
        class="guide-exclusive-btn"
        :class="{ active: exclusiveMode }"
        @click="$emit('toggleExclusive')"
        :title="exclusiveMode ? '点击显示全部颜色' : '点击只看当前颜色'"
      >
        <EyeIcon v-if="exclusiveMode" :size="14" />
        <EyeOffIcon v-else :size="14" />
      </button>

      <!-- 步骤控制 -->
      <div class="guide-controls">
        <button class="guide-btn" :disabled="!hasPrev" @click="$emit('prev')">
          <ChevronLeftIcon :size="20" />
        </button>

        <div class="guide-step-indicator" @click="$emit('togglePanel')">
          <span class="guide-step-num">{{ currentIdx + 1 }} / {{ totalSteps }}</span>
          <div class="guide-progress-track">
            <div class="guide-progress-fill" :style="{ width: progress + '%' }" />
          </div>
        </div>

        <button class="guide-btn" :disabled="!hasNext" @click="$emit('next')">
          <ChevronRightIcon :size="20" />
        </button>
      </div>

      <!-- 标记完成 -->
      <button
        class="guide-done-btn"
        :class="{ done: isCurrentDone }"
        @click="$emit('toggleDone', currentIdx)"
      >
        <CheckCircleIcon :size="18" />
        <span>{{ isCurrentDone ? '已标记' : '完成' }}</span>
      </button>
    </div>

    <!-- 步骤列表面板 -->
    <div v-if="showPanel" class="guide-step-panel">
      <div class="guide-panel-header">
        <span>{{ stepMode === 'color' ? '全部颜色' : stepMode === 'region' ? '全部区域' : '全部图层' }}</span>
        <span class="guide-panel-count">{{ finishedCount }}/{{ totalSteps }}</span>
      </div>
      <div class="guide-step-list">
        <button
          v-for="(step, idx) in steps"
          :key="idx"
          class="guide-step-item"
          :class="{ active: idx === currentIdx, done: isStepDone(idx) }"
          @click="$emit('jumpTo', idx); $emit('togglePanel')"
        >
          <div
            v-if="step.hex"
            class="guide-step-swatch"
            :style="{ background: step.hex }"
          />
          <div v-else class="guide-step-swatch region-swatch">
            {{ idx + 1 }}
          </div>
          <span class="guide-step-name">{{ step.name || step.label || step.hex }}</span>
          <span class="guide-step-count">{{ step.count }}</span>
          <CheckCircleIcon v-if="isStepDone(idx)" :size="14" class="text-emerald-500" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon,
  EyeIcon, EyeOffIcon,
} from 'lucide-vue-next'

const props = defineProps({
  steps: { type: Array, default: () => [] },
  currentIdx: { type: Number, default: 0 },
  finishedSet: { type: Set, default: () => new Set() },
  stepMode: { type: String, default: 'color' },
  showPanel: { type: Boolean, default: false },
  exclusiveMode: { type: Boolean, default: true },
})

defineEmits([
  'prev', 'next', 'toggleDone', 'jumpTo',
  'switchMode', 'togglePanel', 'openColorPanel',
  'toggleExclusive',
])

const modes = [
  { key: 'color', label: '按颜色' },
  { key: 'region', label: '按区域' },
  { key: 'layer', label: '按图层' },
]

const currentStep = computed(() => props.steps[props.currentIdx] || null)
const totalSteps = computed(() => props.steps.length)
const hasPrev = computed(() => props.currentIdx > 0)
const hasNext = computed(() => props.currentIdx < totalSteps.value - 1)
const progress = computed(() => {
  if (!totalSteps.value) return 0
  return Math.round((props.finishedSet.size / totalSteps.value) * 100)
})
const finishedCount = computed(() => props.finishedSet.size)
const isCurrentDone = computed(() => props.finishedSet.has(props.currentIdx))

function isStepDone(idx) {
  return props.finishedSet.has(idx)
}
</script>

<style scoped>
.make-guide-bar {
  position: relative;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
  z-index: 20;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}

.guide-mode-row {
  display: flex;
  justify-content: center;
  padding: 6px 0 4px;
}

.guide-mode-tabs {
  display: flex;
  gap: 2px;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 2px;
}

.guide-mode-tab {
  padding: 3px 12px;
  border: none;
  background: none;
  font-size: 11px;
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s;
}
.guide-mode-tab.active {
  background: #fff;
  color: #2563eb;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.guide-main-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
}

.guide-color-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 70px;
  cursor: pointer;
}
.guide-color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
.region-swatch {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9 !important;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}
.guide-color-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.guide-color-name {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 80px;
}
.guide-color-count {
  font-size: 11px;
  color: #94a3b8;
}

.guide-exclusive-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}
.guide-exclusive-btn.active {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #2563eb;
}

.guide-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.guide-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.guide-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}
.guide-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.guide-step-indicator {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  min-width: 0;
}
.guide-step-num {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}
.guide-progress-track {
  width: 100%;
  height: 3px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}
.guide-progress-fill {
  height: 100%;
  background: #10b981;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.guide-done-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 0 12px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  white-space: nowrap;
}
.guide-done-btn:hover {
  background: #f0fdf4;
  border-color: #86efac;
  color: #16a34a;
}
.guide-done-btn.done {
  background: #ecfdf5;
  border-color: #6ee7b7;
  color: #059669;
}

/* 步骤列表面板 */
.guide-step-panel {
  position: absolute;
  bottom: calc(100% + 2px);
  left: 10px;
  right: 10px;
  max-height: 320px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.guide-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #f1f5f9;
}
.guide-panel-count {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 400;
}
.guide-step-list {
  overflow-y: auto;
  max-height: 260px;
}
.guide-step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 14px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  color: #475569;
  transition: background 0.1s;
  text-align: left;
}
.guide-step-item:hover { background: #f8fafc; }
.guide-step-item.active { background: #eff6ff; color: #2563eb; font-weight: 600; }
.guide-step-item.done { color: #94a3b8; }

.guide-step-swatch {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
.guide-step-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.guide-step-count {
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
}
</style>
