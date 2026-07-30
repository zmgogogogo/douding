<!-- ============================================
  MakeTopBar.vue — 制作模式顶部状态栏
  返回按钮 + 标题/进度信息 + 更多菜单
  ============================================ -->
<template>
  <div class="make-topbar">
    <!-- 返回 -->
    <button class="make-topbar-back" @click="$emit('back')">
      <ChevronLeftIcon :size="20" />
    </button>

    <!-- 标题 + 进度 -->
    <div class="make-topbar-center" @click="$emit('toggleStepList')">
      <h1 class="make-topbar-title">{{ title }}</h1>
      <div class="make-topbar-subtitle">
        <span>{{ gridWidth }}×{{ gridHeight }}</span>
        <span class="make-topbar-dot">·</span>
        <span>{{ totalBeads }}颗</span>
        <span class="make-topbar-dot">·</span>
        <span>{{ totalColors }}色</span>
        <span v-if="showProgress" class="make-topbar-dot">·</span>
        <span v-if="showProgress">{{ progressText }}</span>
      </div>
      <!-- 进度条 -->
      <div v-if="showProgress" class="make-topbar-progress-track">
        <div
          class="make-topbar-progress-fill"
          :style="{ width: progressPercent + '%' }"
        />
      </div>
    </div>

    <!-- 更多菜单 -->
    <div class="make-topbar-right">
      <button class="make-topbar-btn" @click="$emit('toggleTheme')" :title="themeLabel">
        <SunIcon v-if="currentTheme === 'light'" :size="16" />
        <MoonIcon v-else-if="currentTheme === 'dark'" :size="16" />
        <EyeIcon v-else :size="16" />
      </button>
      <button class="make-topbar-btn" @click="$emit('openMenu')">
        <MoreHorizontalIcon :size="20" />
      </button>

      <!-- 下拉菜单 -->
      <div v-if="menuOpen" class="make-topbar-menu" @click.stop>
        <button @click="$emit('toggleBrowse')">
          <EyeIcon :size="15" />
          {{ isBrowseMode ? '分步制作模式' : '全局浏览模式' }}
        </button>
        <button @click="$emit('openSettings')">
          <SettingsIcon :size="15" />
          设置
        </button>
        <button @click="$emit('openArchives')">
          <FolderIcon :size="15" />
          存档管理
        </button>
        <button v-if="isBrowseMode" @click="$emit('resetBrowseProgress')">
          <RotateCcwIcon :size="15" />
          重置浏览进度
        </button>
        <button v-else @click="$emit('resetProgress')">
          <RotateCcwIcon :size="15" />
          重置制作进度
        </button>
        <button @click="$emit('screenshot')">
          <CameraIcon :size="15" />
          截图分享
        </button>
        <hr class="make-topbar-divider" />
        <button v-if="autoPlay" @click="$emit('stopAutoPlay')">
          <PauseIcon :size="15" />
          停止自动播放
        </button>
        <button v-else @click="$emit('startAutoPlay')">
          <PlayIcon :size="15" />
          自动播放
        </button>
        <button @click="$emit('finishMake')" class="text-emerald-500">
          <CheckCircleIcon :size="15" />
          完成制作
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  ChevronLeftIcon,
  MoreHorizontalIcon,
  SunIcon,
  MoonIcon,
  EyeIcon,
  SettingsIcon,
  FolderIcon,
  RotateCcwIcon,
  CameraIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
} from 'lucide-vue-next'

const props = defineProps({
  title: { type: String, default: '' },
  gridWidth: { type: Number, default: 58 },
  gridHeight: { type: Number, default: 58 },
  totalBeads: { type: Number, default: 0 },
  totalColors: { type: Number, default: 0 },
  progressPercent: { type: Number, default: 0 },
  progressText: { type: String, default: '' },
  showProgress: { type: Boolean, default: true },
  isBrowseMode: { type: Boolean, default: false },
  currentTheme: { type: String, default: 'dark' },
  autoPlay: { type: Boolean, default: false },
  menuOpen: { type: Boolean, default: false },
})

defineEmits([
  'back', 'toggleStepList', 'toggleTheme', 'openMenu',
  'toggleBrowse', 'openSettings', 'openArchives',
  'resetProgress', 'resetBrowseProgress', 'screenshot',
  'startAutoPlay', 'stopAutoPlay', 'finishMake',
])

const themeLabel = computed(() => {
  switch (props.currentTheme) {
    case 'light': return '亮色模式'
    case 'dark': return '深色模式'
    case 'eyeCare': return '护眼模式'
    default: return '切换主题'
  }
})
</script>

<style scoped>
.make-topbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  padding-top: max(8px, env(safe-area-inset-top));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  z-index: 30;
  position: relative;
}

.make-topbar-back {
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
  flex-shrink: 0;
}

.make-topbar-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  cursor: pointer;
}

.make-topbar-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
}

.make-topbar-subtitle {
  font-size: 11px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
}

.make-topbar-dot {
  margin: 0 1px;
}

.make-topbar-progress-track {
  margin-top: 3px;
  width: 100%;
  height: 2.5px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.make-topbar-progress-fill {
  height: 100%;
  background: #10b981;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.make-topbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
}

.make-topbar-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.make-topbar-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 190px;
  background: #fff;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  z-index: 40;
}

.make-topbar-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: none;
  font-size: 13px;
  color: #475569;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
}
.make-topbar-menu button:hover {
  background: #f8fafc;
}

.make-topbar-divider {
  border: none;
  border-top: 1px solid #f1f5f9;
  margin: 4px 0;
}
</style>
