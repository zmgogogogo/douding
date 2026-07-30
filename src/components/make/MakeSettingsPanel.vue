<!-- ============================================
  MakeSettingsPanel.vue — 制作模式设置面板
  三标签页：显示设置 / 操作设置 / 主题设置
  ============================================ -->
<template>
  <div class="settings-overlay" @click.self="$emit('close')">
    <div class="settings-panel">
      <div class="settings-header">
        <h3>制作设置</h3>
        <button class="settings-close" @click="$emit('close')">✕</button>
      </div>

      <!-- 标签页 -->
      <div class="settings-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="settings-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" :size="14" />
          {{ tab.label }}
        </button>
      </div>

      <!-- 显示设置 -->
      <div v-if="activeTab === 'display'" class="settings-body">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">网格显示</span>
            <span class="setting-desc">显示图纸网格线</span>
          </div>
          <label class="setting-switch">
            <input v-model="local.showGrid" type="checkbox" @change="emitUpdate" />
            <span class="switch-track" />
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">色号标注</span>
            <span class="setting-desc">在色块上显示色号文字</span>
          </div>
          <label class="setting-switch">
            <input v-model="local.showLabels" type="checkbox" @change="emitUpdate" />
            <span class="switch-track" />
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">高亮强度</span>
            <span class="setting-desc">当前步骤的颜色高亮程度</span>
          </div>
          <select v-model="local.highlightIntensity" class="setting-select" @change="emitUpdate">
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">已完成透明度</span>
            <span class="setting-desc">{{ Math.round(local.finishedOpacity * 100) }}%</span>
          </div>
          <input
            v-model.number="local.finishedOpacity"
            type="range" min="0" max="1" step="0.05"
            class="setting-slider"
            @input="emitUpdate"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">未完成透明度</span>
            <span class="setting-desc">{{ Math.round(local.unfinishedOpacity * 100) }}%</span>
          </div>
          <input
            v-model.number="local.unfinishedOpacity"
            type="range" min="0" max="1" step="0.05"
            class="setting-slider"
            @input="emitUpdate"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">十字定位线</span>
            <span class="setting-desc">帮助精准定位的参考线</span>
          </div>
          <select v-model="local.crosshairMode" class="setting-select" @change="emitUpdate">
            <option value="follow">跟随触摸</option>
            <option value="always">常显</option>
            <option value="off">关闭</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">坐标显示</span>
            <span class="setting-desc">实时显示当前行列坐标</span>
          </div>
          <label class="setting-switch">
            <input v-model="local.showCoords" type="checkbox" @change="emitUpdate" />
            <span class="switch-track" />
          </label>
        </div>
      </div>

      <!-- 操作设置 -->
      <div v-if="activeTab === 'operation'" class="settings-body">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">分步方式</span>
            <span class="setting-desc">默认的分步引导方式</span>
          </div>
          <select v-model="local.stepMode" class="setting-select" @change="emitUpdate">
            <option value="color">按颜色</option>
            <option value="region">按区域</option>
            <option value="layer">按图层</option>
          </select>
        </div>

        <div class="setting-item" v-if="local.stepMode === 'color'">
          <div class="setting-info">
            <span class="setting-label">颜色排序</span>
            <span class="setting-desc">步骤中颜色的排列顺序</span>
          </div>
          <select v-model="local.colorSort" class="setting-select" @change="emitUpdate">
            <option value="desc">用量从多到少</option>
            <option value="asc">用量从少到多</option>
            <option value="hue">按色相</option>
          </select>
        </div>

        <div class="setting-item" v-if="local.stepMode === 'region'">
          <div class="setting-info">
            <span class="setting-label">区域划分</span>
            <span class="setting-desc">{{ local.regionCols }} × {{ local.regionRows }}</span>
          </div>
          <select v-model="local.regionCols" class="setting-select" style="width:48%" @change="emitUpdate">
            <option :value="2">2</option><option :value="3">3</option><option :value="4">4</option>
          </select>
          <span>x</span>
          <select v-model="local.regionRows" class="setting-select" style="width:48%" @change="emitUpdate">
            <option :value="2">2</option><option :value="3">3</option><option :value="4">4</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">自动下一步</span>
            <span class="setting-desc">标记完成后自动跳转下一步</span>
          </div>
          <label class="setting-switch">
            <input v-model="local.autoNext" type="checkbox" @change="emitUpdate" />
            <span class="switch-track" />
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">自动播放速度</span>
            <span class="setting-desc">{{ local.autoPlaySpeed }} 秒/步</span>
          </div>
          <select v-model.number="local.autoPlaySpeed" class="setting-select" @change="emitUpdate">
            <option :value="3">3 秒</option>
            <option :value="5">5 秒</option>
            <option :value="10">10 秒</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">音量键翻步</span>
            <span class="setting-desc">实体音量键控制上一步/下一步</span>
          </div>
          <label class="setting-switch">
            <input v-model="local.volumeKeysStep" type="checkbox" @change="emitUpdate" />
            <span class="switch-track" />
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">屏幕常亮</span>
            <span class="setting-desc">制作过程中不自动锁屏</span>
          </div>
          <label class="setting-switch">
            <input v-model="local.keepScreenOn" type="checkbox" @change="emitUpdate" />
            <span class="switch-track" />
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">防误触锁定</span>
            <span class="setting-desc">锁定画布缩放平移，防止误操作</span>
          </div>
          <label class="setting-switch">
            <input v-model="local.antiMisTouch" type="checkbox" @change="emitUpdate" />
            <span class="switch-track" />
          </label>
        </div>
      </div>

      <!-- 主题设置 -->
      <div v-if="activeTab === 'theme'" class="settings-body">
        <div class="theme-options">
          <button
            v-for="t in themes"
            :key="t.key"
            class="theme-card"
            :class="{ active: local.theme === t.key }"
            @click="local.theme = t.key; emitUpdate()"
          >
            <div class="theme-preview" :class="`theme-preview-${t.key}`">
              <div class="theme-preview-inner" />
            </div>
            <span class="theme-name">{{ t.label }}</span>
            <span class="theme-desc">{{ t.desc }}</span>
          </button>
        </div>
      </div>

      <!-- 底部 -->
      <div class="settings-footer">
        <button class="settings-reset" @click="resetDefaults">恢复默认</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { MonitorIcon, SlidersIcon, PaletteIcon } from 'lucide-vue-next'

const props = defineProps({
  settings: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update', 'close'])

const tabs = [
  { key: 'display', label: '显示', icon: MonitorIcon },
  { key: 'operation', label: '操作', icon: SlidersIcon },
  { key: 'theme', label: '主题', icon: PaletteIcon },
]

const themes = [
  { key: 'dark', label: '深色模式', desc: '护眼暗色背景' },
  { key: 'light', label: '亮色模式', desc: '明亮浅色背景' },
  { key: 'eyeCare', label: '护眼模式', desc: '暖黄色调' },
]

const activeTab = ref('display')

const local = reactive({ ...props.settings })

watch(() => props.settings, (s) => {
  Object.assign(local, s)
}, { deep: true })

function emitUpdate() {
  emit('update', { ...local })
}

function resetDefaults() {
  Object.assign(local, {
    showGrid: true,
    showLabels: false,
    highlightIntensity: 'medium',
    finishedOpacity: 0.4,
    unfinishedOpacity: 0.2,
    crosshairMode: 'follow',
    showCoords: true,
    theme: 'dark',
    stepMode: 'color',
    colorSort: 'desc',
    autoNext: false,
    volumeKeysStep: false,
    keepScreenOn: true,
    antiMisTouch: false,
    autoPlaySpeed: 3,
    regionCols: 3,
    regionRows: 3,
  })
  emitUpdate()
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.settings-panel {
  width: 100%;
  max-width: 480px;
  max-height: 75vh;
  background: #fff;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 10px;
}
.settings-header h3 {
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}
.settings-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
}

.settings-tabs {
  display: flex;
  gap: 4px;
  padding: 0 16px;
  border-bottom: 1px solid #f1f5f9;
}
.settings-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px;
  border: none;
  background: none;
  font-size: 12px;
  color: #94a3b8;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}
.settings-tab.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  font-weight: 600;
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f8fafc;
  gap: 10px;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.setting-label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.setting-desc {
  font-size: 11px;
  color: #94a3b8;
}

.setting-select {
  height: 30px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 0 8px;
  font-size: 12px;
  color: #475569;
  background: #f8fafc;
}

.setting-slider {
  width: 100px;
  accent-color: #2563eb;
}

/* Switch */
.setting-switch {
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  cursor: pointer;
}
.setting-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.switch-track {
  position: absolute;
  inset: 0;
  background: #e2e8f0;
  border-radius: 12px;
  transition: background 0.2s;
}
.switch-track::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 2px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}
.setting-switch input:checked + .switch-track {
  background: #2563eb;
}
.setting-switch input:checked + .switch-track::after {
  transform: translateX(20px);
}

/* Theme cards */
.theme-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.theme-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}
.theme-card.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.theme-preview {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.06);
}
.theme-preview-dark { background: #0f172a; }
.theme-preview-light { background: #f8fafc; }
.theme-preview-eyeCare { background: #fefce8; }

.theme-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.theme-desc {
  font-size: 11px;
  color: #94a3b8;
}

.settings-footer {
  padding: 12px 16px;
  border-top: 1px solid #f1f5f9;
  text-align: center;
}

.settings-reset {
  font-size: 12px;
  color: #ef4444;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
}
</style>
