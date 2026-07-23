<!--
  EditorMenuBar.vue — 顶部主菜单栏（V3.0 文档第3节）
  7个一级菜单：文件/编辑/视图/图像/图层/协作/帮助
-->
<template>
  <nav class="menu-bar" @mouseleave="closeAll">
    <!-- 系统菜单（macOS 风格左侧） -->
    <div class="flex items-center h-full">
      <button
        class="menu-item"
        :class="{ open: openMenu === 'file' }"
        @pointerenter="openMenu = 'file'"
      >
        文件
      </button>
      <button
        class="menu-item"
        :class="{ open: openMenu === 'edit' }"
        @pointerenter="openMenu = 'edit'"
      >
        编辑
      </button>
      <button
        class="menu-item"
        :class="{ open: openMenu === 'view' }"
        @pointerenter="openMenu = 'view'"
      >
        视图
      </button>
      <button
        class="menu-item"
        :class="{ open: openMenu === 'image' }"
        @pointerenter="openMenu = 'image'"
      >
        图像
      </button>
      <button
        class="menu-item"
        :class="{ open: openMenu === 'layer' }"
        @pointerenter="openMenu = 'layer'"
      >
        图层
      </button>
      <button
        class="menu-item"
        :class="{ open: openMenu === 'collab' }"
        @pointerenter="openMenu = 'collab'"
      >
        协作
      </button>
      <button
        class="menu-item"
        :class="{ open: openMenu === 'help' }"
        @pointerenter="openMenu = 'help'"
      >
        帮助
      </button>
    </div>

    <!-- 右侧：标题 + 快捷操作 -->
    <div class="flex items-center gap-2 ml-auto mr-2">
      <span class="text-[11px] text-[var(--ui-text-secondary)] truncate max-w-[200px]">{{
        title
      }}</span>
      <span
        v-if="hasUnsaved"
        class="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"
        title="未保存"
      />
    </div>

    <!-- 下拉菜单面板 -->
    <Teleport to="body">
      <div
        v-if="openMenu"
        class="menu-dropdown"
        :style="dropdownStyle"
        @pointerleave="openMenu = null"
      >
        <!-- 文件菜单 -->
        <template v-if="openMenu === 'file'">
          <button class="dd-item" @click="act('newDesign')">
            <span>新建图纸</span><kbd>⌘N</kbd>
          </button>
          <button class="dd-item" @click="act('open')"><span>打开文件</span><kbd>⌘O</kbd></button>
          <div class="dd-sep" />
          <button class="dd-item" @click="act('save')"><span>保存</span><kbd>⌘S</kbd></button>
          <button class="dd-item" @click="act('saveAs')">
            <span>另存为...</span><kbd>⇧⌘S</kbd>
          </button>
          <div class="dd-sep" />
          <button class="dd-item" @click="act('exportPNG')"><span>导出 PNG</span></button>
          <button class="dd-item" @click="act('exportSVG')"><span>导出 SVG</span></button>
          <button class="dd-item" @click="act('exportPDF')"><span>导出 PDF</span></button>
          <button class="dd-item" @click="act('exportCSV')"><span>导出色号矩阵 CSV</span></button>
          <button class="dd-item" @click="act('exportMaterial')">
            <span>导出用料清单 CSV</span>
          </button>
          <button class="dd-item" @click="act('exportJSON')"><span>导出 JSON</span></button>
          <div class="dd-sep" />
          <button class="dd-item" @click="act('print')"><span>打印...</span><kbd>⌘P</kbd></button>
          <div class="dd-sep" />
          <button class="dd-item" @click="act('close')"><span>关闭</span><kbd>⌘W</kbd></button>
        </template>

        <!-- 编辑菜单 -->
        <template v-if="openMenu === 'edit'">
          <button class="dd-item" :class="{ disabled: !canUndo }" @click="act('undo')">
            <span>撤销</span><kbd>⌘Z</kbd>
          </button>
          <button class="dd-item" :class="{ disabled: !canRedo }" @click="act('redo')">
            <span>重做</span><kbd>⇧⌘Z</kbd>
          </button>
          <div class="dd-sep" />
          <button class="dd-item" @click="act('cut')"><span>剪切</span><kbd>⌘X</kbd></button>
          <button class="dd-item" @click="act('copy')"><span>复制</span><kbd>⌘C</kbd></button>
          <button class="dd-item" @click="act('paste')"><span>粘贴</span><kbd>⌘V</kbd></button>
          <div class="dd-sep" />
          <button class="dd-item" @click="act('selectAll')"><span>全选</span><kbd>⌘A</kbd></button>
          <button class="dd-item" @click="act('deselect')">
            <span>取消选择</span><kbd>⌘D</kbd>
          </button>
          <button class="dd-item" @click="act('invertSelect')">
            <span>反选</span><kbd>⌘I</kbd>
          </button>
          <div class="dd-sep" />
          <button class="dd-item" @click="act('flipH')"><span>水平翻转</span></button>
          <button class="dd-item" @click="act('flipV')"><span>垂直翻转</span></button>
          <div class="dd-sep" />
          <button class="dd-item" @click="act('preferences')">
            <span>首选项...</span><kbd>⌘,</kbd>
          </button>
        </template>

        <!-- 视图菜单 -->
        <template v-if="openMenu === 'view'">
          <button class="dd-item" @click="act('zoomIn')"><span>放大</span><kbd>⌘+</kbd></button>
          <button class="dd-item" @click="act('zoomOut')"><span>缩小</span><kbd>⌘-</kbd></button>
          <button class="dd-item" @click="act('zoomFit')">
            <span>适配屏幕</span><kbd>⌘0</kbd>
          </button>
          <button class="dd-item" @click="act('zoomActual')">
            <span>实际大小</span><kbd>⌘1</kbd>
          </button>
          <div class="dd-sep" />
          <button class="dd-item" :class="{ checked: showGrid }" @click="act('toggleGrid')">
            <span>显示网格</span>
          </button>
          <button class="dd-item" @click="act('toggleRuler')"><span>显示标尺</span></button>
          <div class="dd-sep" />
          <button class="dd-item" @click="act('fullscreen')">
            <span>全屏模式</span><kbd>F</kbd>
          </button>
        </template>

        <!-- 图像菜单 -->
        <template v-if="openMenu === 'image'">
          <button class="dd-item" @click="act('autoFit')"><span>裁剪到内容</span></button>
          <button class="dd-item" @click="act('openSizeDialog')">
            <span>修改画布尺寸...</span>
          </button>
          <div class="dd-sep" />
          <button class="dd-item" @click="act('invertColors')"><span>反相</span></button>
          <button class="dd-item" @click="act('grayscale')"><span>灰度化</span></button>
        </template>

        <!-- 图层菜单 -->
        <template v-if="openMenu === 'layer'">
          <button class="dd-item" @click="act('addLayer')">
            <span>新建图层</span><kbd>⇧⌘N</kbd>
          </button>
          <button class="dd-item" @click="act('removeLayer')"><span>删除图层</span></button>
          <button class="dd-item" @click="act('mergeDown')"><span>向下合并</span></button>
          <div class="dd-sep" />
          <button class="dd-item" @click="act('addMask')"><span>添加蒙版</span></button>
          <button class="dd-item" @click="act('toggleMaskEdit')"><span>编辑蒙版</span></button>
          <div class="dd-sep" />
          <button class="dd-item" @click="act('alignLeft')"><span>左对齐</span></button>
          <button class="dd-item" @click="act('alignCenter')"><span>水平居中</span></button>
          <button class="dd-item" @click="act('alignRight')"><span>右对齐</span></button>
          <button class="dd-item" @click="act('alignTop')"><span>顶对齐</span></button>
          <button class="dd-item" @click="act('alignMiddle')"><span>垂直居中</span></button>
          <button class="dd-item" @click="act('alignBottom')"><span>底对齐</span></button>
        </template>

        <!-- 协作菜单（占位，阶段6实现） -->
        <template v-if="openMenu === 'collab'">
          <button class="dd-item disabled"><span>分享协作...</span></button>
          <button class="dd-item disabled"><span>版本历史</span></button>
          <button class="dd-item disabled"><span>评论批注</span></button>
        </template>

        <!-- 帮助菜单 -->
        <template v-if="openMenu === 'help'">
          <button class="dd-item" @click="act('shortcuts')">
            <span>快捷键列表</span><kbd>?</kbd>
          </button>
          <button class="dd-item" @click="act('about')"><span>关于豆丁</span></button>
        </template>
      </div>
    </Teleport>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  title: { type: String, default: '未命名图纸' },
  hasUnsaved: { type: Boolean, default: false },
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false },
  showGrid: { type: Boolean, default: true },
})

const emit = defineEmits([
  'newDesign',
  'open',
  'save',
  'saveAs',
  'exportPNG',
  'exportSVG',
  'exportPDF',
  'exportCSV',
  'exportMaterial',
  'exportJSON',
  'print',
  'close',
  'undo',
  'redo',
  'cut',
  'copy',
  'paste',
  'selectAll',
  'deselect',
  'invertSelect',
  'flipH',
  'flipV',
  'preferences',
  'zoomIn',
  'zoomOut',
  'zoomFit',
  'zoomActual',
  'toggleGrid',
  'toggleRuler',
  'fullscreen',
  'autoFit',
  'openSizeDialog',
  'invertColors',
  'grayscale',
  'addLayer',
  'removeLayer',
  'mergeDown',
  'addMask',
  'toggleMaskEdit',
  'alignLeft',
  'alignCenter',
  'alignRight',
  'alignTop',
  'alignMiddle',
  'alignBottom',
  'shortcuts',
  'about',
])

const openMenu = ref(null)

const dropdownStyle = computed(() => {
  if (!openMenu.value) return { display: 'none' }
  // 找到对应按钮的位置
  const btn = document.querySelector(`.menu-item.open`)
  if (!btn) return { display: 'none' }
  const rect = btn.getBoundingClientRect()
  return {
    position: 'fixed',
    top: rect.bottom + 2 + 'px',
    left: rect.left + 'px',
    zIndex: 1000,
  }
})

function act(eventName) {
  emit(eventName)
  openMenu.value = null
}

function closeAll() {
  openMenu.value = null
}

// Esc 关闭菜单
function onKey(e) {
  if (e.key === 'Escape') openMenu.value = null
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.menu-bar {
  @apply flex items-center h-7 bg-[var(--ui-bg-surface)] border-b border-[var(--ui-border-glass)]
         select-none flex-shrink-0;
  -webkit-app-region: drag;
}

.menu-item {
  @apply h-full px-2.5 text-[11px] font-medium text-[var(--ui-text-secondary)]
         hover:bg-[var(--ui-bg-tertiary)] hover:text-[var(--ui-text-primary)]
         transition-colors rounded-none relative;
  -webkit-app-region: no-drag;
}
.menu-item.open {
  background: color-mix(in srgb, var(--ui-accent) 10%, transparent);
  color: var(--ui-accent);
}
</style>

<style>
/* 全局样式（因为 Teleport 到 body） */
.menu-dropdown {
  background: var(--ui-bg-surface, #fff);
  border: 1px solid var(--ui-border-glass, #e5e7eb);
  border-radius: 12px;
  padding: 4px;
  min-width: 180px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(20px);
}

.dd-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 5px 10px;
  font-size: 12px;
  color: var(--ui-text-primary, #1f2937);
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.1s;
  text-align: left;
  border: none;
  background: none;
}
.dd-item:hover {
  background: var(--ui-bg-tertiary, #f3f4f6);
}
.dd-item.disabled {
  opacity: 0.35;
  cursor: default;
  pointer-events: none;
}
.dd-item.checked span::before {
  content: '✓ ';
  color: var(--ui-accent, #0058bc);
}

.dd-item kbd {
  font-size: 10px;
  color: var(--ui-text-tertiary, #9ca3af);
  font-family: system-ui, monospace;
}

.dd-sep {
  height: 1px;
  background: var(--ui-border, #e5e7eb);
  margin: 3px 6px;
}
</style>
