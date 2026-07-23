<!-- ============================================
  EditorView.vue — 拼豆编辑器主页面 (V3.0 布局)
  布局：顶部栏 + 左工具箱 + 中画布 + 右面板 + 底状态栏
  入口页：智能工具卡片 + 最近编辑
  ============================================ -->
<template>
  <!-- ====== 创作入口页 ====== -->
  <div v-if="!inEditor" class="overflow-y-auto h-full">
    <div class="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <!-- 模块1：开始新项目 -->
      <div
        class="relative overflow-hidden rounded-[2rem] bg-white p-6 md:p-8 cursor-pointer active:scale-[0.98] transition-all duration-300 border border-black/[0.04]"
        style="box-shadow: var(--ui-shadow-md)"
        @click="startBlank"
        @mouseenter="e => { e.currentTarget.style.boxShadow = 'var(--ui-shadow-lg)'; e.currentTarget.style.transform = 'translateY(-1px)' }"
        @mouseleave="e => { e.currentTarget.style.boxShadow = 'var(--ui-shadow-md)'; e.currentTarget.style.transform = '' }"
      >
        <div
          class="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-50"
          style="background: radial-gradient(circle, rgba(255, 214, 102, 0.35), transparent 70%)"
        />
        <div
          class="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-40"
          style="background: radial-gradient(circle, rgba(125, 211, 252, 0.38), transparent 70%)"
        />
        <div
          class="absolute top-1/2 -right-8 w-28 h-28 rounded-full opacity-30"
          style="background: radial-gradient(circle, rgba(244, 114, 182, 0.24), transparent 70%)"
        />
        <div class="relative z-10 flex items-start justify-between">
          <div class="flex items-start gap-4">
            <div
              class="w-11 h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md"
            >
              <PlusIcon :size="22" class="text-white" />
            </div>
            <div>
              <h2 class="text-xl md:text-2xl font-extrabold text-slate-800 mb-1">开始新项目</h2>
              <p class="text-sm text-slate-400">从空白画布开始您的像素艺术之旅</p>
            </div>
          </div>
          <div
            class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-xs text-blue-600 font-medium flex-shrink-0"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-green-400" />创作模式
          </div>
        </div>
        <div class="relative z-10 flex justify-end mt-4">
          <div
            class="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors"
          >
            <ArrowRightIcon :size="18" class="text-primary" />
          </div>
        </div>
      </div>

      <!-- 模块2：智能工具标题栏 -->
      <div class="flex items-center justify-between">
        <h3 class="text-[15px] font-bold text-slate-400">智能工具</h3>
        <a
          class="flex items-center gap-1 text-[13px] text-blue-500 font-medium cursor-pointer hover:text-blue-600"
          @click="toast.show('使用教程即将上线')"
          ><BookIcon :size="14" />使用教程</a
        >
      </div>

      <!-- 模块3：智能工具卡片 -->
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div class="tool-card" @click="$router.push('/image-import')">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style="
                background: linear-gradient(
                  135deg,
                  rgba(125, 211, 252, 0.2),
                  rgba(125, 211, 252, 0.05)
                );
              "
            >
              <CameraIcon :size="20" class="text-sky-500" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-sm text-slate-800">照片转图纸</div>
              <div class="text-[11px] text-slate-400 mt-0.5">将图片智能转化为拼豆图案</div>
            </div>
            <ChevronRightIcon :size="16" class="text-slate-300" />
          </div>
        </div>
        <div class="tool-card" @click="$router.push('/ocr')">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style="
              background: linear-gradient(
                135deg,
                rgba(59, 130, 246, 0.15),
                rgba(59, 130, 246, 0.04)
              );
            "
          >
            <ScanTextIcon :size="20" class="text-blue-600" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm text-slate-800">OCR 识别图纸</div>
            <div class="text-[11px] text-slate-400 mt-0.5">拍照或上传图纸自动识别颜色符号</div>
          </div>
          <ChevronRightIcon :size="16" class="text-slate-300" />
        </div>
      </div>

      <!-- 最近编辑 -->
      <section v-if="recentDesigns.length" class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-[17px] font-bold text-slate-900">最近编辑</h2>
          <router-link to="/warehouse" class="text-[13px] text-primary font-medium hover:underline"
            >查看全部</router-link
          >
        </div>
        <div class="space-y-2">
          <div
            v-for="d in recentDesigns"
            :key="d.id"
            class="flex items-center gap-3 bg-white rounded-xl p-2.5 cursor-pointer border border-slate-100 hover:shadow-md active:scale-[0.99] transition-all"
            @click="openDesign(d.id)"
          >
            <div
              class="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center"
            >
              <canvas :ref="(el) => renderRecentThumb(el, d)" class="w-full h-full pixel-thumb" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate text-slate-800">{{ d.title }}</div>
              <div class="text-slate-400 text-xs mt-0.5">
                {{ d.gridWidth }}×{{ d.gridHeight }} · {{ d.beadCount || 0 }}颗
              </div>
            </div>
            <ClockIcon :size="14" class="text-slate-300" />
          </div>
        </div>
      </section>

      <!-- 画布尺寸选择弹窗 -->
      <div
        v-if="showSizePicker"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-md animate-fade-in"
        @click.self="showSizePicker = false"
      >
        <div
          class="bg-white rounded-[2rem] p-5 w-[340px] max-w-[90vw] space-y-4 animate-scale-in"
          style="box-shadow: var(--ui-shadow-xl)"
        >
          <h3 class="font-bold text-slate-800 text-sm">选择画布尺寸</h3>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="p in sizePresets"
              :key="p.label"
              class="p-3 rounded-xl border border-slate-200 hover:border-primary hover:bg-blue-50 transition-colors text-left"
              @click="confirmSize(p.w, p.h)"
            >
              <div class="font-semibold text-sm text-slate-700">{{ p.label }}</div>
              <div class="text-[10px] text-slate-400">{{ p.w }}×{{ p.h }} · {{ p.desc }}</div>
            </button>
          </div>
          <div class="flex items-center gap-2 pt-1">
            <input
              v-model.number="sizeDialogW"
              type="number"
              min="10"
              max="300"
              class="flex-1 h-9 border border-slate-200 rounded-lg px-3 text-xs text-center"
              placeholder="宽"
            />
            <span class="text-slate-300">×</span>
            <input
              v-model.number="sizeDialogH"
              type="number"
              min="10"
              max="300"
              class="flex-1 h-9 border border-slate-200 rounded-lg px-3 text-xs text-center"
              placeholder="高"
            />
            <button
              class="h-9 px-3 rounded-lg bg-primary text-white text-xs font-medium"
              @click="confirmSize(sizeDialogW, sizeDialogH)"
            >
              确定
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- ====== 编辑器视图 (V3.0 布局) ====== -->
  <div v-else class="fixed inset-0 z-50 flex flex-col bg-[var(--ui-bg-base)]">
    <!-- ===== 顶部菜单栏 ===== -->
    <EditorMenuBar
      :title="editTitle"
      :hasUnsaved="hasUnsavedChanges"
      :canUndo="historyIdx > 0"
      :canRedo="historyIdx < historyArr.length - 1"
      :showGrid="showGrid"
      @newDesign="exitEditor"
      @save="saveDesign"
      @exportPNG="exportPNG"
      @exportSVG="exportSVG"
      @exportPDF="exportPDFFile"
      @exportCSV="exportCSV"
      @exportMaterial="exportMaterial"
      @exportJSON="exportJSONFile"
      @undo="undo"
      @redo="redo"
      @cut="copySelection(); deleteSelection(); scheduleRender()"
      @copy="copySelection()"
      @paste="pasteSelection(); saveSnapshot(); renderAll()"
      @selectAll="selectionRect = { r1: 0, c1: 0, r2: gridH - 1, c2: gridW - 1 }; scheduleRender()"
      @deselect="selectionRect = null; scheduleRender()"
      @flipH="flipSelectionH(); scheduleRender()"
      @flipV="flipSelectionV(); scheduleRender()"
      @zoomIn="zoom = Math.min(30, zoom * 1.25)"
      @zoomOut="zoom = Math.max(0.5, zoom / 1.25)"
      @zoomFit="zoom = Math.min(30, Math.floor(Math.min(canvasContainerW / gridW, canvasContainerH / gridH) * 0.9))"
      @zoomActual="zoom = 10"
      @toggleGrid="showGrid = !showGrid"
      @print="showPrintPreview = true"
      @fullscreen="toggleFullscreen"
      @autoFit="autoFitGrid(4); renderAll()"
      @openSizeDialog="openSizeDialog()"
      @invertColors="onInvertColors"
      @grayscale="onGrayscale"
      @addLayer="addLayer('新图层'); renderAll()"
      @removeLayer="removeLayer(currentLayerId); renderAll()"
      @mergeDown="mergeLayerDown(currentLayerId); renderAll()"
      @addMask="addMask(currentLayerId); renderAll()"
      @toggleMaskEdit="maskEditMode = !maskEditMode"
      @alignLeft="alignLayers(layers.filter(l => l.id !== currentLayerId).map(l => l.id).concat([currentLayerId]), 'left'); renderAll()"
      @alignCenter="alignLayers(layers.filter(l => l.id !== currentLayerId).map(l => l.id).concat([currentLayerId]), 'center'); renderAll()"
      @alignRight="alignLayers(layers.filter(l => l.id !== currentLayerId).map(l => l.id).concat([currentLayerId]), 'right'); renderAll()"
      @alignTop="alignLayers(layers.filter(l => l.id !== currentLayerId).map(l => l.id).concat([currentLayerId]), 'top'); renderAll()"
      @alignMiddle="alignLayers(layers.filter(l => l.id !== currentLayerId).map(l => l.id).concat([currentLayerId]), 'middle'); renderAll()"
      @alignBottom="alignLayers(layers.filter(l => l.id !== currentLayerId).map(l => l.id).concat([currentLayerId]), 'bottom'); renderAll()"
      @shortcuts="showShortcuts = true"
    />

    <!-- ===== 顶部导航栏 ===== -->
    <EditorTopBar
      :title="editTitle"
      :hasUnsaved="hasUnsavedChanges"
      :canUndo="historyIdx > 0"
      :canRedo="historyIdx < historyArr.length - 1"
      :showGrid="showGrid"
      :refOpacity="refOpacity"
      @back="exitEditor"
      @update:title="editTitle = $event"
      @undo="undo; renderAll()"
      @redo="redo; renderAll()"
      @toggleGrid="showGrid = !showGrid"
      @toggleRef="cycleRefOpacity"
      @exportPNG="exportPNG"
      @exportSVG="exportSVG"
      @exportPDF="exportPDFFile"
      @exportJSON="exportJSONFile"
      @save="saveDesign"
      @showInfo="showInfo = !showInfo"
      @openSizeDialog="showSizePanel = true"
      @clear="confirmClear"
      @toggleSymmetry="cycleSymmetry"
      @toggleGuide="toggleGuideMode"
    />

    <!-- ===== 主工作区：左工具 + 中画布 + 右面板 ===== -->
    <div class="flex-1 flex min-h-0">
      <!-- 左侧工具箱 -->
      <EditorToolbar
        :currentTool="tool"
        :showGrid="showGrid"
        :symmetryMode="symmetryMode"
        :guideMode="guideMode"
        :refOpacity="refOpacity"
        @selectTool="onSelectTool"
        @toggleGrid="showGrid = !showGrid"
        @cycleSymmetry="cycleSymmetry"
        @cycleRefOpacity="cycleRefOpacity"
      />

      <!-- 中心画布区 -->
      <div class="flex-1 relative overflow-hidden decorative-glow">
        <EditorCanvas
          ref="editorCanvasRef"
          :gridW="gridW"
          :gridH="gridH"
          :grid="grid"
          :zoom="zoom"
          :panX="panX"
          :panY="panY"
          :tool="tool"
          :brushSize="brushSize"
          :curColor="curColor"
          :highlightHex="highlightHex"
          :symmetryMode="symmetryMode"
          :showGrid="showGrid"
          :editMode="editMode"
          :guideMode="guideMode"
          :refOpacity="refOpacity"
          :refPixels="refPixels"
          :refW="refW"
          :refH="refH"
          :refOffsetX="refOffsetX"
          :refOffsetY="refOffsetY"
          :refScale="refScale"
          :guideCurrentColor="guideCurrentColor"
          :guideProgress="guideProgress"
          :guideColorIdx="guideColorIdx"
          :guideAutoPlay="guideAutoPlay"
          :guideSpeed="guideSpeed"
          :selectionRect="selectionRect"
          :beadCount="beadCount"
          :replaceSourceHex="replaceSourceHex"
          :focusDimHex="focusMode && focusColor ? focusColor.hex : null"
          @setCell="setCellAndRender"
          @saveSnapshot="saveSnapshot"
          @scheduleRender="scheduleRender"
          @expandGrid="onExpandGrid"
          @update:panX="panX = $event"
          @update:panY="panY = $event"
          @update:zoom="onCanvasZoom"
          @update:mouseCol="mouseCol = $event"
          @update:mouseRow="mouseRow = $event"
          @update:mouseColor="mouseColor = $event"
          @setRefOpacity="setRefOpacity"
          @refZoomIn="refScale = Math.min(3, (refScale || 1) * 1.25)"
          @refZoomOut="refScale = Math.max(0.25, (refScale || 1) * 0.8)"
          @refMove="(dx, dy) => {; refOffsetX += dx; refOffsetY += dy; }"
          @refReset="refScale = 1; refOffsetX = 0; refOffsetY = 0"
          @toggleGuide="toggleGuideMode"
          @guidePrev="guidePrev"
          @guideNext="guideNext"
          @toggleAutoPlay="toggleAutoPlay"
          @setGuideSpeed="setGuideSpeed"
          @pickColor="onPickColor"
          @floodFill="onFloodFill"
          @magicWand="onMagicWand"
          @lassoClick="onLassoClick"
          @shapePreview="onShapePreview"
          @drawShape="onDrawShape"
          @placeText="onPlaceText"
        />
      </div>

      <!-- 右侧面板组 -->
      <EditorRightPanel
        :activeTab="rightPanelTab"
        :brand="brand"
        :seriesActive="seriesActive"
        :brands="brands"
        :seriesList="series"
        :colors="filteredColors"
        :curColor="curColor"
        :brushSize="brushSize"
        :stats="gridColorStats"
        :totalColorCount="totalColorCount"
        :brandColorCounts="brandColorCounts"
        :searchText="colorSearch"
        :recentColors="recentColors"
        :inventory="inventory"
        :warehouseOnly="warehouseOnly"
        :grid="compositeGrid"
        :layers="layers"
        :currentLayerId="currentLayerId"
        :blendModes="BLEND_MODES"
        :maskEditMode="maskEditMode"
        :historyArr="historyArr"
        :historyIdx="historyIdx"
        :gridW="gridW"
        :gridH="gridH"
        :beadCount="beadCount"
        :currentTool="tool"
        :symmetryMode="symmetryMode"
        @update:activeTab="rightPanelTab = $event"
        @update:brand="brand = $event; seriesActive = ''"
        @update:seriesActive="seriesActive = $event"
        @update:searchText="colorSearch = $event"
        @update:brushSize="brushSize = $event"
        @update:warehouseOnly="warehouseOnly = $event"
        @selectColor="onSelectColor"
        @highlightColor="onHighlightColor"
        @addLayer="addLayer('新图层'); renderAll()"
        @removeLayer="removeLayer($event); renderAll()"
        @selectLayer="selectLayer($event); renderAll()"
        @toggleVisibility="toggleLayerVisibility($event); renderAll()"
        @toggleLock="toggleLayerLock"
        @setOpacity="(v) => {; setLayerOpacity(currentLayerId, v); renderAll(); }"
        @setBlendMode="(v) => {; setLayerBlendMode(currentLayerId, v); renderAll(); }"
        @addMask="addMask($event); renderAll()"
        @removeMask="removeMask($event); renderAll()"
        @applyMask="applyMask($event); renderAll()"
        @toggleMaskEdit="maskEditMode = !maskEditMode"
        @applyPalette="onApplyPalette"
        @jumpToHistory="onJumpToHistory"
        @createSnapshot="saveSnapshot"
      />
    </div>

    <!-- ===== 底部色卡统计条 ===== -->
    <div
      v-if="gridColorStats.length"
      class="h-9 bg-[var(--ui-bg-surface)] border-t border-[var(--ui-border)] flex items-center px-3 gap-1.5 overflow-x-auto scrollbar-hide flex-shrink-0 z-10"
    >
      <span class="text-[9px] text-[var(--ui-text-tertiary)] flex-shrink-0"
        >{{ gridColorStats.length }}色</span
      >
      <div
        v-for="s in gridColorStats"
        :key="s.hex"
        class="flex items-center gap-1 flex-shrink-0 px-1.5 py-0.5 rounded-md hover:bg-[var(--ui-bg-tertiary)] cursor-pointer transition-colors"
        @click="onSelectColor(s)"
      >
        <div
          class="w-3.5 h-3.5 rounded-sm ring-1 ring-black/10 flex-shrink-0"
          :style="{ background: s.hex }"
        />
        <span class="text-[10px] text-[var(--ui-text-primary)] font-medium">{{
          s.name?.split(' ')[0] || s.name
        }}</span>
        <span class="text-[9px] text-[var(--ui-text-tertiary)] font-mono">{{ s.count }}</span>
      </div>
    </div>

    <!-- ===== 底部状态栏 ===== -->
    <EditorStatusBar
      :gridW="gridW"
      :gridH="gridH"
      :beadCount="beadCount"
      :colorCount="gridColorStats.length"
      :zoom="zoom"
      :mouseCol="mouseCol"
      :mouseRow="mouseRow"
      :mouseColor="mouseColor"
      :modeLabel="modeLabel"
      @update:zoom="onStatusBarZoom"
      @zoomIn="zoomIn"
      @zoomOut="zoomOut"
    />

    <!-- ===== 尺寸修改弹窗 ===== -->
    <div
      v-if="showSizePanel"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/25 backdrop-blur-md"
      @click.self="showSizePanel = false"
    >
      <div
        class="bg-white rounded-[2rem] p-5 w-[320px] max-w-[90vw] space-y-3 animate-scale-in"
        style="box-shadow: var(--ui-shadow-xl)"
      >
        <h3 class="text-sm font-bold text-slate-800">修改画布尺寸</h3>
        <div class="flex items-center gap-2">
          <input
            v-model.number="sizeDialogW"
            type="number"
            min="10"
            max="300"
            class="flex-1 h-10 border border-slate-200 rounded-xl px-3 text-sm text-center outline-none focus:border-primary"
            placeholder="宽"
          />
          <span class="text-slate-400 font-bold">×</span>
          <input
            v-model.number="sizeDialogH"
            type="number"
            min="10"
            max="300"
            class="flex-1 h-10 border border-slate-200 rounded-xl px-3 text-sm text-center outline-none focus:border-primary"
            placeholder="高"
          />
        </div>
        <div class="flex gap-2">
          <button
            class="flex-1 h-10 rounded-xl bg-slate-100 text-slate-500 text-sm font-medium"
            @click="showSizePanel = false"
          >
            取消
          </button>
          <button
            class="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-medium"
            @click="doResize"
          >
            确认
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 专注模式覆盖层 ===== -->
    <EditorFocusMode
      v-if="focusMode && focusColor"
      :focusColor="focusColor"
      :beadCount="focusBeadCount"
      @exit="focusMode = false; highlightHex = null; renderAll()"
    />
  </div>

  <!-- 打印预览 -->
  <EditorPrintPreview
    v-if="showPrintPreview"
    :grid="compositeGrid"
    :gridW="gridW"
    :gridH="gridH"
    :gridColorStats="gridColorStats"
    @close="showPrintPreview = false"
  />

  <!-- 隐藏的文件输入 -->
  <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'
import { useDialog } from '@/composables/useDialog.js'
import { useEditor } from '@/composables/useEditor.js'

import {
  PlusIcon,
  ArrowRightIcon,
  BookIcon,
  CameraIcon,
  ScanTextIcon,
  ChevronRightIcon,
  ClockIcon,
} from 'lucide-vue-next'

import EditorTopBar from '@/components/editor/EditorTopBar.vue'
import EditorMenuBar from '@/components/editor/EditorMenuBar.vue'
import EditorPrintPreview from '@/components/editor/EditorPrintPreview.vue'
import EditorCanvas from '@/components/editor/EditorCanvas.vue'
import EditorFocusMode from '@/components/editor/EditorFocusMode.vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import EditorRightPanel from '@/components/editor/EditorRightPanel.vue'
import EditorStatusBar from '@/components/editor/EditorStatusBar.vue'
import { generateSVG, downloadSVG } from '@/utils/svgExport.js'
import { bresenhamLine, drawRect, drawCircle, drawPixelText } from '@/utils/shapeDrawing.js'
import { exportColorMatrixCSV, exportMaterialList, downloadCSV } from '@/utils/exportFormats.js'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const toast = useToast()
const dialog = useDialog()

// 从 composable 解构状态
const {
  gridW,
  gridH,
  grid,
  zoom,
  panX,
  panY,
  tool,
  brushSize,
  curColor,
  highlightHex,
  symmetryMode,
  showGrid,
  refOpacity,
  refLocked,
  refPixels,
  refW,
  refH,
  refImage,
  refOffsetX,
  refOffsetY,
  refScale,
  editMode,
  guideMode,
  focusMode,
  selectionRect,
  clipboard,
  replaceSourceHex,
  guideColorIdx,
  guideDone,
  guideColors,
  guideCurrentColor,
  guideProgress,
  historyArr,
  historyIdx,
  beadData,
  inventory,
  warehouseOnly,
  editId,
  editTitle,
  hasUnsavedChanges,
  autoSaveKey,
  showInfo,
  showSizeDialog,
  sizeDialogW,
  sizeDialogH,
  showColorStats,
  mousePos,
  crossCol,
  crossRow,
  mouseCol,
  mouseRow,
  mouseColor,
  activePanelTab,
  modeLabel,
  brand,
  seriesActive,
  brands,
  series,
  filteredColors,
  beadCount,
  gridColorStats,
  brandColorCounts,
  totalColorCount,
  seriesColorCount,
  brushPreviewStyle,
  colorSearch,
  recentColors,
  addRecentColor,
  autoFitGrid,
  layers,
  currentLayerId,
  BLEND_MODES,
  addLayer,
  removeLayer,
  selectLayer,
  toggleLayerVisibility,
  setLayerOpacity,
  setLayerBlendMode,
  mergeLayerDown,
  getCompositeGrid,
  maskEditMode,
  addMask,
  removeMask,
  applyMask,
  toggleMaskEnabled,
  setMaskCell,
  getMaskHex,
  initGrid,
  resetEditorSession,
  getCell,
  setCell,
  expandGridToFit,
  saveSnapshot,
  undo,
  redo,
  restoreSnapshot,
  cycleSymmetry,
  cycleRefOpacity,
  setRefOpacity,
  toggleRefLock,
  toggleGuideMode,
  guidePrev,
  guideNext,
  guideAutoPlay,
  guideSpeed,
  guideGroupBy,
  guideJumpTo,
  toggleAutoPlay,
  stopAutoPlay,
  setGuideSpeed,
  openSizeDialog,
  applyResize,
  deleteSelection,
  copySelection,
  pasteSelection,
  flipSelectionH,
  flipSelectionV,
  magicWandSelect,
  lassoSelect,
  cycleSelectionMode,
  getOrderedRect,
  createGroup,
  ungroup,
  alignLayers,
  setLayerStyle,
  removeLayerStyle,
  selectionMode,
} = useEditor()

const compositeGrid = computed(() => getCompositeGrid())
const editorCanvasRef = ref(null)
const fileInput = ref(null)
const canvasContainerW = ref(800)
const canvasContainerH = ref(600)
const showShortcuts = ref(false)
const showPrintPreview = ref(false)

// 画布容器尺寸监听
function updateCanvasSize() {
  const el = document.querySelector('.editor-canvas-wrap')
  if (el) {
    canvasContainerW.value = el.clientWidth
    canvasContainerH.value = el.clientHeight
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}

function onInvertColors() {
  // 修复：遍历当前图层而非复合网格，确保 setCell 操作正确的图层
  for (let r = 0; r < gridH.value; r++) {
    for (let c = 0; c < gridW.value; c++) {
      const cell = getCell(r, c)
      if (cell?.hex) {
        const h = cell.hex.replace('#', '')
        const inv =
          '#' +
          (255 - parseInt(h.slice(0, 2), 16)).toString(16).padStart(2, '0') +
          (255 - parseInt(h.slice(2, 4), 16)).toString(16).padStart(2, '0') +
          (255 - parseInt(h.slice(4, 6), 16)).toString(16).padStart(2, '0')
        setCell(r, c, { ...cell, hex: inv })
      }
    }
  }
  saveSnapshot()
  renderAll()
}

function onGrayscale() {
  for (let r = 0; r < gridH.value; r++) {
    for (let c = 0; c < gridW.value; c++) {
      const cell = getCell(r, c)
      if (cell?.hex) {
        const h = cell.hex.replace('#', '')
        const gray = Math.round(
          parseInt(h.slice(0, 2), 16) * 0.299 +
            parseInt(h.slice(2, 4), 16) * 0.587 +
            parseInt(h.slice(4, 6), 16) * 0.114
        )
        const gHex = '#' + gray.toString(16).padStart(2, '0').repeat(3)
        setCell(r, c, { ...cell, hex: gHex })
      }
    }
  }
  saveSnapshot()
  renderAll()
}

// ---- AI 增强处理 ----

function onApplyPalette(colors) {
  if (!colors?.length) return
  // 将推荐配色方案中的颜色逐个匹配到珠子颜色并选中
  const matched = []
  for (const c of colors) {
    const bead = findClosestBead(c.hex || c)
    if (bead) matched.push(bead)
  }
  if (matched.length > 0) {
    // 将匹配到的颜色加入最近使用
    for (const m of matched) addRecentColor(m)
    // 选中第一个匹配颜色
    curColor.value = matched[0]
    toast.show(`已应用 ${matched.length} 种配色到色板`)
  } else {
    toast.show('未找到匹配的珠子颜色')
  }
}

/** 在珠子颜色列表中查找最接近的颜色（简易实现） */
function findClosestBead(hex) {
  if (!hex || !beadData.value?.length) return null
  const targetHex = hex.replace('#', '').toUpperCase()
  const targetR = parseInt(targetHex.slice(0, 2), 16)
  const targetG = parseInt(targetHex.slice(2, 4), 16)
  const targetB = parseInt(targetHex.slice(4, 6), 16)
  let best = null,
    bestDist = Infinity
  for (const b of beadData.value) {
    const h = b.hex.replace('#', '')
    const dr = targetR - parseInt(h.slice(0, 2), 16)
    const dg = targetG - parseInt(h.slice(2, 4), 16)
    const db = targetB - parseInt(h.slice(4, 6), 16)
    const dist = dr * dr * 2 + dg * dg * 3 + db * db
    if (dist < bestDist) {
      bestDist = dist
      best = b
    }
  }
  return best
}

// ---- 创作入口页状态 ----
const inEditor = ref(false)
const recentDesigns = ref([])
const rightPanelTab = ref(activePanelTab)
const showSizePanel = ref(false)

// 同步 rightPanelTab 到 composable（使模式标签在状态栏正确显示）
watch(rightPanelTab, (v) => {
  activePanelTab.value = v
})

// 专注模式
const focusColor = ref(null)
const focusBeadCount = computed(() => {
  if (!focusColor.value) return 0
  let n = 0
  for (const r of compositeGrid.value) {
    if (!r) continue
    for (const c of r) {
      if (c?.hex?.toUpperCase() === focusColor.value.hex.toUpperCase()) n++
    }
  }
  return n
})

// 自动保存
const autoSaveTimer = ref(null)

// 渲染调度
let rafId = null
function setCellAndRender(r, c, color) {
  setCell(r, c, color)
  scheduleRender()
}

// 画布动态扩展
function onExpandGrid({ row, col, brushSize: bs }) {
  const padding = { top: 0, bottom: 0, left: 0, right: 0 }
  const EXPAND = 10

  if (row < 0) padding.top = Math.abs(row) + EXPAND
  if (row + bs > gridH.value) padding.bottom = row + bs - gridH.value + EXPAND
  if (col < 0) padding.left = Math.abs(col) + EXPAND
  if (col + bs > gridW.value) padding.right = col + bs - gridW.value + EXPAND

  if (padding.top === 0 && padding.bottom === 0 && padding.left === 0 && padding.right === 0) return

  const { offsetC, offsetR } = expandGridToFit(padding)
  if (offsetC === 0 && offsetR === 0) return

  panX.value -= offsetC * zoom.value
  panY.value -= offsetR * zoom.value
  refOffsetX.value += offsetC
  refOffsetY.value += offsetR

  nextTick(() => {
    editorCanvasRef.value?.initCanvas()
    renderAll()
  })
}

function scheduleRender() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    editorCanvasRef.value?.renderAll()
  })
}

function renderAll() {
  editorCanvasRef.value?.renderAll()
}

// ---- 工具栏操作 ----
function onSelectTool(t) {
  tool.value = t
  if (t === 'select') selectionRect.value = null
  if (t !== 'replace') replaceSourceHex.value = null
}

function onSelectColor(c) {
  addRecentColor(c)
  if (tool.value === 'replace') {
    if (!replaceSourceHex.value) {
      replaceSourceHex.value = c.hex
      toast.show('已选源色，请点击目标色完成替换')
    } else {
      replaceColor(replaceSourceHex.value, c)
      replaceSourceHex.value = null
    }
    return
  }
  curColor.value = { ...c }
  if (focusMode.value) {
    focusMode.value = false
    highlightHex.value = null
  }
  if (highlightHex.value === c.hex) {
    focusColor.value = c
    focusMode.value = true
  } else {
    focusMode.value = false
  }
  highlightHex.value = highlightHex.value === c.hex ? null : c.hex
  renderAll()
}

function onHighlightColor(hex) {
  highlightHex.value = highlightHex.value === hex ? null : hex
  renderAll()
}

function onPickColor(row, col) {
  const cell = getCell(row, col)
  if (cell?.hex) {
    curColor.value = cell
    addRecentColor(cell)
    if (tool.value === 'picker') tool.value = 'brush'
    highlightHex.value = cell.hex
    renderAll()
  }
}

// ---- 缩放 ----
function onCanvasZoom(v) {
  zoom.value = Math.max(0.5, Math.min(30, v))
}
function onStatusBarZoom(v) {
  zoom.value = v
}
function zoomIn() {
  zoom.value = Math.max(0.5, Math.min(30, zoom.value * 1.25))
}
function zoomOut() {
  zoom.value = Math.max(0.5, Math.min(30, zoom.value * 0.8))
}

// ---- 颜色替换 ----
function replaceColor(sourceHex, targetColor) {
  let count = 0
  for (let r = 0; r < gridH.value; r++) {
    for (let c = 0; c < gridW.value; c++) {
      const cell = getCell(r, c)
      if (cell?.hex?.toUpperCase() === sourceHex.toUpperCase()) {
        setCell(r, c, targetColor)
        count++
      }
    }
  }
  saveSnapshot()
  renderAll()
  toast.show(`已替换 ${count} 个珠子`)
}

// ---- 洪水填充 ----
function onFloodFill(sr, sc) {
  const targetCell = getCell(sr, sc)
  const targetHex = targetCell?.hex || null
  const fillColor = curColor.value

  if (targetHex && fillColor && targetHex.toUpperCase() === fillColor.hex.toUpperCase()) return
  if (!targetHex && !fillColor) return

  const visited = new Set()
  const queue = [[sr, sc]]

  while (queue.length > 0) {
    const [r, c] = queue.shift()
    const cell = getCell(r, c)
    const currentHex = cell?.hex || null

    if (targetHex === null && currentHex !== null) continue
    if (targetHex !== null && currentHex?.toUpperCase() !== targetHex.toUpperCase()) continue

    setCell(r, c, fillColor)

    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = r + dr,
        nc = c + dc
      if (nr < 0 || nr >= gridH.value || nc < 0 || nc >= gridW.value) continue
      const key = `${nr},${nc}`
      if (visited.has(key)) continue
      visited.add(key)
      queue.push([nr, nc])
    }
  }

  saveSnapshot()
  renderAll()
}

// ---- 魔棒选区 ----
function onMagicWand(r, c) {
  magicWandSelect(r, c, 0)
  scheduleRender()
}

// ---- 套索选区 ----
const lassoPoints = []
function onLassoClick(r, c) {
  lassoPoints.push({ r, c })
  if (lassoPoints.length >= 3) {
    lassoSelect(lassoPoints)
    lassoPoints.length = 0 // 清空路径
    scheduleRender()
  }
}

// ---- 形状绘制 ----
function onShapePreview({ tool, r1, c1, r2, c2 }) {
  // 预览由 InteractionLayer 处理，此处仅记录
}

function onDrawShape({ tool, r1, c1, r2, c2 }) {
  if (!curColor.value) return

  let cells = []
  switch (tool) {
    case 'line':
      cells = bresenhamLine(r1, c1, r2, c2, Math.max(1, brushSize.value))
      break
    case 'rect':
      cells = drawRect(r1, c1, r2, c2, 'outline', Math.max(1, brushSize.value))
      break
    case 'circle': {
      const rr = Math.round(Math.sqrt((r2 - r1) ** 2 + (c2 - c1) ** 2))
      cells = drawCircle(r1, c1, rr, 'outline')
      break
    }
  }

  for (const { r, c } of cells) {
    setCell(r, c, curColor.value)
  }
  saveSnapshot()
  renderAll()
}

function onPlaceText(r, c) {
  const text = prompt('输入文字（A-Z, 0-9）：', 'HELLO')
  if (!text || !curColor.value) return
  const cells = drawPixelText(text, r, c, Math.max(1, brushSize.value))
  for (const { r: cr, c: cc } of cells) {
    setCell(cr, cc, curColor.value)
  }
  saveSnapshot()
  renderAll()
}

// ---- 图层锁定 ----
function toggleLayerLock(id) {
  const layer = layers.value.find((l) => l.id === id)
  if (layer) layer.locked = !layer.locked
}

// ---- 历史跳转 ----
function onJumpToHistory(index) {
  if (index === historyIdx.value) return
  historyIdx.value = index
  restoreSnapshot(historyArr.value[index])
  nextTick(() => {
    editorCanvasRef.value?.initCanvas()
    renderAll()
  })
}

// ---- 导出 ----
async function exportPNG() {
  toast.show('正在生成高清 PNG...')
  try {
    const cg = getCompositeGrid()
    const blob = await API.download('/api/export/grid', {
      gridData: cg,
      gridWidth: gridW.value,
      gridHeight: gridH.value,
      scale: 10,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (editTitle.value || '拼豆图纸') + '.png'
    a.click()
    URL.revokeObjectURL(url)
    toast.show('PNG 导出成功')
  } catch (e) {
    toast.show('导出失败，请稍后重试')
  }
}

async function exportPDFFile() {
  toast.show('正在生成 PDF 图纸...')
  try {
    const cg = getCompositeGrid()
    const blob = await API.download('/api/export/pdf', {
      gridData: cg,
      gridWidth: gridW.value,
      gridHeight: gridH.value,
      title: editTitle.value,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (editTitle.value || '拼豆图纸') + '.pdf'
    a.click()
    URL.revokeObjectURL(url)
    toast.show('PDF 导出成功')
  } catch (e) {
    toast.show('导出失败，请稍后重试')
  }
}

function exportSVG() {
  const comp = getCompositeGrid()
  const svg = generateSVG(comp, gridW.value, gridH.value, {
    cellSize: 10,
    showGrid: true,
    showLabels: false,
  })
  downloadSVG(svg, `${editTitle.value || '拼豆图纸'}.svg`)
}

function exportCSV() {
  const comp = getCompositeGrid()
  const csv = exportColorMatrixCSV(comp, gridW.value, gridH.value)
  downloadCSV(csv, `${editTitle.value || '拼豆图纸'}_色号矩阵.csv`)
}

function exportMaterial() {
  const csv = exportMaterialList(gridColorStats.value)
  downloadCSV(csv, `${editTitle.value || '拼豆图纸'}_用料清单.csv`)
}

function exportJSONFile() {
  const cg = getCompositeGrid()
  const data = {
    title: editTitle.value,
    gridW: gridW.value,
    gridH: gridH.value,
    grid: cg,
    version: '2.0',
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = (editTitle.value || '拼豆图纸') + '.json'
  a.click()
  URL.revokeObjectURL(url)
  toast.show('JSON 导出成功')
}

// ---- 图片导入 ----
function triggerImport() {
  fileInput.value?.click()
}

async function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  toast.show('正在分析图片...')
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('targetWidth', gridW.value)
    const res = await API.upload('/api/image-to-grid', formData)
    if (res.code === 200 && res.data) {
      gridW.value = res.data.gridWidth
      gridH.value = res.data.gridHeight
      grid.value = res.data.grid
      if (res.data.refImage) {
        refImage.value = res.data.refImage
        refW.value = res.data.gridWidth
        refH.value = res.data.gridHeight
        refPixels.value = res.data.grid
        refOpacity.value = 0.3
      }
      saveSnapshot()
      nextTick(() => {
        editorCanvasRef.value?.initCanvas()
        renderAll()
      })
      toast.show('图片转换完成')
    }
  } catch (e) {
    toast.show('图片分析失败，请稍后重试')
  }
  fileInput.value.value = ''
}

// ---- 画布尺寸预设 ----
const sizePresets = [
  { label: '小', w: 29, h: 29, desc: '迷你钥匙扣' },
  { label: '中', w: 58, h: 58, desc: '标准拼豆板' },
  { label: '大', w: 87, h: 87, desc: '大幅作品' },
  { label: '横版', w: 87, h: 58, desc: '横版装饰画' },
  { label: '竖版', w: 58, h: 87, desc: '竖版挂件' },
]
const showSizePicker = ref(false)

function startBlank() {
  showSizePicker.value = true
}

function confirmSize(w, h) {
  const safeW = Number.isFinite(w) && w >= 10 ? Math.round(w) : 50
  const safeH = Number.isFinite(h) && h >= 10 ? Math.round(h) : 50
  gridW.value = safeW
  gridH.value = safeH
  showSizePicker.value = false
  resetEditorSession()
  focusColor.value = null
  focusMode.value = false
  inEditor.value = true
  initGrid(gridW.value, gridH.value)
  // 自动选中第一个可用颜色
  if (!curColor.value && filteredColors.value.length > 0) {
    curColor.value = { ...filteredColors.value[0] }
  }
  saveSnapshot()
  nextTick(() => {
    editorCanvasRef.value?.initCanvas()
    renderAll()
  })
}

async function loadRecentDesigns() {
  try {
    const res = await API.get('/api/designs?limit=5&sort=updated', true)
    if (res.code === 200) recentDesigns.value = res.data || []
  } catch (_) {
    /* offline */
  }
}

async function openDesign(id) {
  try {
    const res = await API.get(`/api/designs/${id}`)
    if (res.code === 200 && res.data) {
      const d = res.data
      resetEditorSession()
      focusColor.value = null
      focusMode.value = false
      editId.value = d.id
      editTitle.value = d.title || '未命名图纸'
      const parsedGrid = typeof d.gridData === 'string' ? JSON.parse(d.gridData) : d.gridData
      initGrid(d.gridWidth, d.gridHeight)
      grid.value = parsedGrid
      layers.value[0].grid = parsedGrid
      saveSnapshot()
      inEditor.value = true
      if (!curColor.value && filteredColors.value.length > 0) {
        curColor.value = { ...filteredColors.value[0] }
      }
      nextTick(() => {
        editorCanvasRef.value?.initCanvas()
        renderAll()
      })
    }
  } catch (_) {
    toast.show('加载设计失败')
  }
}

function renderRecentThumb(el, design) {
  if (!el || !design.gridData) return
  nextTick(() => {
    const grid = typeof design.gridData === 'string' ? JSON.parse(design.gridData) : design.gridData
    if (!grid) return
    const canvas = el
    const ctx = canvas.getContext('2d')
    canvas.width = design.gridWidth
    canvas.height = design.gridHeight
    ctx.imageSmoothingEnabled = false
    for (let r = 0; r < Math.min(design.gridHeight, grid.length); r++) {
      const row = grid[r]
      if (!row) continue
      for (let c = 0; c < Math.min(design.gridWidth, row.length); c++) {
        ctx.fillStyle = row[c]?.hex || '#f0f0f0'
        ctx.fillRect(c, r, 1, 1)
      }
    }
  })
}

// ---- 修改尺寸 ----
function doResize() {
  applyResize()
  showSizePanel.value = false
  nextTick(() => {
    editorCanvasRef.value?.initCanvas()
    renderAll()
  })
}

// ---- 保存 ----
async function saveDesign() {
  if (!editTitle.value.trim()) {
    const name = await dialog.prompt('请输入图纸名称', '保存图纸', editTitle.value || '未命名图纸')
    if (name) editTitle.value = name
    else return
  }
  try {
    const cg = getCompositeGrid()
    const payload = {
      title: editTitle.value,
      gridWidth: gridW.value,
      gridHeight: gridH.value,
      gridData: JSON.stringify(cg),
      beadCount: beadCount.value,
      colorCount: gridColorStats.value.length,
      isPublic: true,
    }
    if (editId.value) {
      await API.put(`/api/designs/${editId.value}`, payload, true)
    } else {
      const res = await API.post('/api/designs', payload, true)
      editId.value = res.data?.id
    }
    hasUnsavedChanges.value = false
    toast.show('保存成功')
  } catch (e) {
    toast.show('保存失败，请稍后重试')
  }
}

async function confirmClear() {
  const ok = await dialog.confirm('确定要清空画布吗？此操作不可撤销。')
  if (ok) {
    initGrid(gridW.value, gridH.value)
    saveSnapshot()
    renderAll()
  }
}

// ---- 自动保存 ----
function autoSave() {
  if (!hasUnsavedChanges.value) return
  try {
    const cg = getCompositeGrid()
    const data = {
      grid: cg,
      gridW: gridW.value,
      gridH: gridH.value,
      editId: editId.value,
      title: editTitle.value,
      time: Date.now(),
    }
    localStorage.setItem(autoSaveKey.value, JSON.stringify(data))
  } catch (_) {
    /* quota exceeded */
  }
}

function clearAutoSave() {
  try {
    localStorage.removeItem(autoSaveKey.value)
  } catch (_) {
    /* noop */
  }
}

// ---- 退出 ----
async function exitEditor() {
  if (hasUnsavedChanges.value) {
    const ok = await dialog.confirm('有未保存的更改，确定退出吗？', '退出编辑器')
    if (!ok) return
  }
  clearAutoSave()
  hasUnsavedChanges.value = false
  resetEditorSession()
  focusColor.value = null
  focusMode.value = false
  inEditor.value = false
  initGrid(gridW.value, gridH.value)
  saveSnapshot()
  loadRecentDesigns()
}

// ---- 快捷键 ----
function onGlobalKeyDown(e) {
  if (!inEditor.value) return
  if (
    e.target.tagName === 'INPUT' ||
    e.target.tagName === 'TEXTAREA' ||
    e.target.tagName === 'SELECT'
  )
    return

  const key = e.key.toLowerCase()
  if ((e.ctrlKey || e.metaKey) && key === 'z') {
    e.preventDefault()
    undo()
    renderAll()
    return
  }
  if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) {
    e.preventDefault()
    redo()
    renderAll()
    return
  }
  if ((e.ctrlKey || e.metaKey) && key === 's') {
    e.preventDefault()
    saveDesign()
    return
  }
  if ((e.ctrlKey || e.metaKey) && key === 'c') {
    e.preventDefault()
    copySelection()
    return
  }
  if ((e.ctrlKey || e.metaKey) && key === 'v') {
    e.preventDefault()
    pasteSelection()
    return
  }
  if ((e.ctrlKey || e.metaKey) && key === 'l') {
    e.preventDefault()
    toggleRefLock()
    return
  }
  if ((e.ctrlKey || e.metaKey) && key === 'n') {
    e.preventDefault()
    toggleGuideMode()
    return
  }
  if (key === 'delete' || key === 'backspace') {
    e.preventDefault()
    deleteSelection()
    return
  }

  switch (key) {
    case 'b':
      tool.value = 'brush'
      break
    case 'e':
      tool.value = 'eraser'
      break
    case 'g':
    case 'f':
      tool.value = 'fill'
      break
    case 'i':
      tool.value = 'picker'
      break
    case 's':
      tool.value = 'select'
      break
    case 'r':
      tool.value = 'replace'
      break
    case 'm':
      tool.value = 'move'
      break
    case 'h':
      showGrid.value = !showGrid.value
      break
    case 'k':
      cycleSymmetry()
      break
    case '[':
      brushSize.value = Math.max(1, brushSize.value - 1)
      break
    case ']':
      brushSize.value = Math.min(8, brushSize.value + 1)
      break
    default:
      return
  }
  e.preventDefault()
}

// ---- 生命周期 ----
onMounted(async () => {
  // 加载珠子数据
  try {
    const res = await API.get('/api/beads/colors')
    if (res.code === 200) beadData.value = res.data || []
  } catch (_) {
    /* offline */
  }

  // 加载库存
  if (auth.isLoggedIn.value) {
    try {
      const res = await API.get('/api/inventory', true)
      if (res.code === 200 && res.data) {
        for (const item of res.data) inventory.value[item.color_id] = item.quantity
      }
    } catch (_) {
      /* offline */
    }
  }

  // 判断是打开已有设计还是显示入口页
  const designId = route.params.id
  if (designId) {
    try {
      const res = await API.get(`/api/designs/${designId}`)
      if (res.code === 200 && res.data) {
        const d = res.data
        editId.value = d.id
        editTitle.value = d.title || '未命名图纸'
        const parsedGrid = typeof d.gridData === 'string' ? JSON.parse(d.gridData) : d.gridData
        initGrid(d.gridWidth, d.gridHeight)
        grid.value = parsedGrid
        layers.value[0].grid = parsedGrid
        saveSnapshot()
        inEditor.value = true
        nextTick(() => {
          setTimeout(() => {
            editorCanvasRef.value?.initCanvas()
            renderAll()
          }, 100)
        })
      }
    } catch (e) {
      console.error('加载设计失败:', e)
    }
  } else {
    // 检查是否有从其他页面导入的数据
    const importedRaw = sessionStorage.getItem('imported_grid')
    if (importedRaw) {
      try {
        const imported = JSON.parse(importedRaw)
        sessionStorage.removeItem('imported_grid')
        const importToast = sessionStorage.getItem('import_toast')
        if (importToast) {
          sessionStorage.removeItem('import_toast')
          nextTick(() => toast.show(importToast))
        }
        if (imported.grid && imported.gridWidth && imported.gridHeight) {
          initGrid(imported.gridWidth, imported.gridHeight)
          grid.value = imported.grid
          layers.value[0].grid = imported.grid
          editId.value = null
          editTitle.value = '导入图纸'
          inEditor.value = true
          saveSnapshot()
          // 延迟确保 DOM 已渲染 canvas 元素
          nextTick(() => {
            setTimeout(() => {
              editorCanvasRef.value?.initCanvas()
              renderAll()
            }, 100)
          })
          return
        }
      } catch (e) {
        console.error('导入图纸数据异常:', e)
        toast.show('导入失败，数据格式异常')
      }
    }

    clearAutoSave()
    initGrid(gridW.value, gridH.value)
    saveSnapshot()
    loadRecentDesigns()
  }

  window.addEventListener('keydown', onGlobalKeyDown)
  window.addEventListener('beforeunload', onBeforeUnload)
  autoSaveTimer.value = setInterval(autoSave, 5000)
})

function onBeforeUnload(e) {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeyDown)
  window.removeEventListener('beforeunload', onBeforeUnload)
  if (autoSaveTimer.value) clearInterval(autoSaveTimer.value)
  autoSave()
})
</script>
