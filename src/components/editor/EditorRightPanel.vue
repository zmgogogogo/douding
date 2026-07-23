<!-- ============================================
  EditorRightPanel.vue — 右侧面板组
  V3.0 文档第5节：标签页切换容器，5个面板
  颜色 / 图层 / 色板 / 历史 / 属性
  ============================================ -->
<template>
  <aside
    class="w-60 bg-[var(--ui-bg-surface)] border-l border-[var(--ui-border-glass)] flex flex-col flex-shrink-0 overflow-hidden select-none max-md:hidden"
  >
    <!-- 标签页头部 -->
    <div class="flex border-b border-[var(--ui-border)]">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="flex-1 py-2 text-[10px] font-medium transition-colors relative"
        :class="
          activeTab === tab.id
            ? 'text-[var(--ui-accent)]'
            : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-tertiary)]'
        "
        @click="$emit('update:activeTab', tab.id)"
      >
        {{ tab.label }}
        <div
          v-if="activeTab === tab.id"
          class="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
          style="background: var(--ui-accent)"
        />
      </button>
    </div>

    <!-- ========== 颜色面板 ========== -->
    <div v-if="activeTab === 'color'" class="flex-1 flex flex-col overflow-hidden">
      <!-- 前景色/背景色 -->
      <div class="px-3 py-2 border-b border-[var(--ui-border)]">
        <div class="flex items-center gap-2">
          <div class="relative w-8 h-8">
            <div class="checkerboard-bg absolute inset-0 rounded-lg" />
            <div
              class="absolute inset-0 rounded-lg ring-1 ring-black/10"
              :style="{ background: curColor?.hex || '#fff' }"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[11px] font-semibold text-[var(--ui-text-primary)] truncate">
              {{ curColor?.name || '未选择' }}
            </div>
            <div class="text-[10px] text-[var(--ui-text-tertiary)] font-mono">
              {{ curColor?.hex || '–' }}
            </div>
          </div>
          <!-- V3.0 阶段一暂不实现背景色互换，隐藏按钮 -->
          <!-- <button class="text-[9px] ... @click="swapFgBg">X</button> -->
        </div>
      </div>

      <!-- 品牌选择 -->
      <div class="px-2 py-1.5 border-b border-[var(--ui-border)]">
        <select
          :value="brand"
          @change="$emit('update:brand', $event.target.value)"
          class="w-full h-7 border border-[var(--ui-border)] rounded-md text-[10px] px-1.5 bg-[var(--ui-bg-base)] text-[var(--ui-text-primary)] outline-none focus:border-[var(--ui-accent)] cursor-pointer"
        >
          <option v-for="b in brands" :key="b" :value="b">
            {{
              b === '全部' ? `全部 · ${totalColorCount}色` : `${b} · ${brandColorCounts[b] || 0}色`
            }}
          </option>
        </select>
      </div>

      <!-- 系列标签 -->
      <div
        class="flex gap-0.5 px-1.5 py-1 border-b border-[var(--ui-border)] overflow-x-auto scrollbar-hide"
      >
        <button
          v-for="s in seriesList"
          :key="s"
          class="px-2 py-0.5 rounded-md text-[9px] font-medium whitespace-nowrap transition-colors flex-shrink-0"
          :class="
            seriesActive === s
              ? 'bg-[var(--ui-accent)]/10 text-[var(--ui-accent)]'
              : 'text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-tertiary)]'
          "
          @click="$emit('update:seriesActive', s)"
        >
          {{ s.length > 10 ? s.slice(0, 10) + '…' : s }}
        </button>
      </div>

      <!-- 搜索 + 最近使用 -->
      <div class="px-2 py-1.5 space-y-1.5 border-b border-[var(--ui-border)]">
        <div class="relative">
          <SearchIcon
            :size="11"
            class="absolute left-1.5 top-1/2 -translate-y-1/2 text-[var(--ui-text-tertiary)]"
          />
          <input
            :value="searchText"
            type="text"
            placeholder="搜索颜色或色号..."
            class="w-full h-7 pl-5 pr-2 border border-[var(--ui-border)] rounded-md text-[10px] bg-[var(--ui-bg-base)] outline-none focus:border-[var(--ui-accent)]"
            @input="$emit('update:searchText', $event.target.value)"
          />
        </div>
        <div v-if="recentColors.length" class="flex flex-wrap gap-1">
          <button
            v-for="c in recentColors"
            :key="c.id ?? c.hex"
            class="w-5 h-5 rounded-md ring-1 ring-black/10 hover:scale-125 hover:z-10 transition-all"
            :style="{ background: c.hex }"
            :title="c.name"
            @click="$emit('selectColor', c)"
          />
        </div>
        <!-- 豆仓限定开关 -->
        <label
          v-if="Object.keys(inventory).length"
          class="flex items-center gap-1.5 cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="warehouseOnly"
            class="w-3 h-3 rounded border-slate-300 text-[var(--ui-accent)]"
            @change="$emit('update:warehouseOnly', $event.target.checked)"
          />
          <span class="text-[10px] text-[var(--ui-text-tertiary)]">
            📦 仅豆仓颜色 ({{ Object.values(inventory).filter((v) => v > 0).length }}色)
          </span>
        </label>
      </div>

      <!-- 颜色网格 -->
      <div class="flex-1 overflow-y-auto p-1.5">
        <div class="grid grid-cols-7 gap-1">
          <button
            v-for="c in colors"
            :key="c.id"
            class="aspect-square rounded-lg transition-all duration-150 relative hover:scale-115 hover:z-10 hover:shadow-md flex items-end justify-center overflow-hidden"
            :class="[
              curColor?.id === c.id
                ? 'ring-2 ring-[var(--ui-accent)] ring-offset-1 scale-110 z-10'
                : 'ring-1 ring-black/5',
              getStock(c.id) === 0 ? 'opacity-50 ring-red-400' : '',
            ]"
            :title="
              c.name + ' ' + c.hex + (getStock(c.id) != null ? ' · 库存' + getStock(c.id) : '')
            "
            @click="$emit('selectColor', c)"
          >
            <div class="checkerboard-bg absolute inset-0 rounded-lg" />
            <div class="absolute inset-0 rounded-lg" :style="{ background: c.hex }" />
            <span
              class="relative text-[7px] font-semibold text-white/90 bg-black/25 rounded-sm px-0.5 leading-tight mb-0.5 select-none"
              style="text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4)"
              >{{ c.name.length > 4 ? c.name.slice(0, 4) : c.name }}</span
            >
            <!-- 库存徽标 -->
            <span
              v-if="getStock(c.id) != null && getStock(c.id) > 0"
              class="absolute top-0.5 right-0.5 text-[7px] font-bold bg-white/90 text-green-600 rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-sm select-none"
              :class="getStock(c.id) <= 50 ? 'text-amber-600' : ''"
            >
              {{ getStock(c.id) >= 100 ? '✓' : '' }}
            </span>
          </button>
        </div>
      </div>

      <!-- 画笔大小 -->
      <div class="px-3 py-2 border-t border-[var(--ui-border)]">
        <div
          class="flex items-center justify-between text-[10px] text-[var(--ui-text-tertiary)] mb-0.5"
        >
          <span>画笔大小</span
          ><span class="font-semibold text-[var(--ui-text-secondary)]">{{ brushSize }}</span>
        </div>
        <input
          :value="brushSize"
          type="range"
          min="1"
          max="8"
          class="w-full h-1.5 accent-[var(--ui-accent)] cursor-pointer rounded-full"
          @input="$emit('update:brushSize', parseInt($event.target.value))"
        />
      </div>

      <!-- 颜色统计 -->
      <div class="border-t border-[var(--ui-border)]">
        <button
          class="w-full flex items-center justify-between px-3 py-1.5 text-[10px] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-tertiary)]"
          @click="statsExpanded = !statsExpanded"
        >
          <span>📊 颜色统计 ({{ stats.length }}色)</span>
          <ChevronRightIcon
            :size="11"
            :class="statsExpanded && 'rotate-90'"
            class="transition-transform"
          />
        </button>
        <div
          v-if="statsExpanded && stats.length"
          class="max-h-32 overflow-y-auto px-2 pb-2 space-y-0.5"
        >
          <div
            v-for="s in stats"
            :key="s.hex"
            class="flex items-center gap-1.5 py-0.5 text-[10px] hover:bg-[var(--ui-bg-tertiary)] rounded px-1 cursor-pointer"
            @click="$emit('highlightColor', s.hex)"
          >
            <div
              class="w-3 h-3 rounded-sm ring-1 ring-black/10 flex-shrink-0"
              :style="{ background: s.hex }"
            />
            <span class="flex-1 truncate text-[var(--ui-text-primary)]">{{ s.name }}</span>
            <span class="font-mono text-[var(--ui-text-tertiary)]">{{ s.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 图层面板 ========== -->
    <div v-if="activeTab === 'layer'" class="flex-1 flex flex-col overflow-hidden">
      <div class="flex-1 overflow-y-auto">
        <div
          v-for="(layer, i) in layers"
          :key="layer.id"
          class="flex items-center gap-1.5 px-2 py-1.5 border-b border-[var(--ui-border)] cursor-pointer hover:bg-[var(--ui-bg-tertiary)] transition-colors"
          :class="layer.id === currentLayerId ? 'bg-[var(--ui-accent)]/8' : ''"
          @click="$emit('selectLayer', layer.id)"
        >
          <!-- 可见性 -->
          <button
            class="w-4 h-4 flex items-center justify-center rounded flex-shrink-0"
            :class="
              layer.visible ? 'text-[var(--ui-text-secondary)]' : 'text-[var(--ui-text-tertiary)]'
            "
            @click.stop="$emit('toggleVisibility', layer.id)"
          >
            <EyeIcon v-if="layer.visible" :size="11" />
            <EyeOffIcon v-else :size="11" />
          </button>
          <!-- 缩略图色块 -->
          <div
            class="w-5 h-5 rounded ring-1 ring-black/5 flex-shrink-0 bg-[var(--ui-bg-tertiary)] flex items-center justify-center relative"
          >
            <div
              v-if="layerPreviewColor(layer)"
              class="w-3 h-3 rounded-sm"
              :style="{ background: layerPreviewColor(layer) }"
            />
            <!-- 蒙版指示器 -->
            <div
              v-if="layer.mask"
              class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-sm bg-black/20 ring-1 ring-black/20 flex items-center justify-center"
            >
              <div class="w-1.5 h-1.5 bg-white/70 rounded-sm" />
            </div>
          </div>
          <!-- 名称 -->
          <span
            class="flex-1 text-[11px] font-medium truncate"
            :class="
              layer.id === currentLayerId
                ? 'text-[var(--ui-accent)]'
                : 'text-[var(--ui-text-primary)]'
            "
          >
            {{ layer.name }}
          </span>
          <!-- 蒙版编辑标记 -->
          <span
            v-if="layer.mask && maskEditMode && layer.id === currentLayerId"
            class="text-[8px] text-white bg-[var(--ui-accent)] rounded-full px-1.5 py-0.5 flex-shrink-0"
            >蒙版</span
          >
          <!-- 锁定 -->
          <button
            class="w-4 h-4 flex items-center justify-center rounded text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]"
            @click.stop="$emit('toggleLock', layer.id)"
          >
            <LockIcon v-if="layer.locked" :size="10" />
            <UnlockIcon v-else :size="10" />
          </button>
        </div>
      </div>
      <!-- 蒙版操作 -->
      <div class="px-2 py-1 border-t border-[var(--ui-border)]">
        <div class="flex gap-0.5">
          <button
            v-if="!selectedLayer?.mask"
            class="flex-1 h-6 rounded text-[9px] bg-[var(--ui-bg-tertiary)] hover:bg-[var(--ui-accent)]/10 hover:text-[var(--ui-accent)] transition-colors text-[var(--ui-text-secondary)]"
            @click="$emit('addMask', currentLayerId)"
          >
            + 蒙版
          </button>
          <template v-else>
            <button
              class="flex-1 h-6 rounded text-[9px] transition-colors"
              :class="
                maskEditMode
                  ? 'bg-[var(--ui-accent)] text-white'
                  : 'bg-[var(--ui-bg-tertiary)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-accent)]/10'
              "
              @click="$emit('toggleMaskEdit')"
            >
              ✏️{{ maskEditMode ? '编辑中' : '编辑' }}
            </button>
            <button
              class="flex-1 h-6 rounded text-[9px] bg-[var(--ui-bg-tertiary)] hover:bg-red-50 hover:text-red-500 transition-colors text-[var(--ui-text-secondary)]"
              @click="$emit('applyMask', currentLayerId)"
            >
              ✓ 应用
            </button>
            <button
              class="px-1.5 h-6 rounded text-[9px] bg-[var(--ui-bg-tertiary)] hover:bg-red-50 hover:text-red-500 transition-colors text-[var(--ui-text-secondary)]"
              @click="$emit('removeMask', currentLayerId)"
            >
              ×
            </button>
          </template>
        </div>
      </div>
      <!-- 选中图层属性 -->
      <div class="px-2 py-1.5 border-t border-[var(--ui-border)] space-y-1.5">
        <div class="flex items-center justify-between text-[10px]">
          <span class="text-[var(--ui-text-tertiary)]">不透明度</span>
          <span class="font-mono text-[var(--ui-text-secondary)] w-7 text-right"
            >{{ Math.round((selectedLayer?.opacity ?? 1) * 100) }}%</span
          >
        </div>
        <input
          type="range"
          min="0"
          max="100"
          :value="Math.round((selectedLayer?.opacity ?? 1) * 100)"
          class="w-full h-1 accent-[var(--ui-accent)] cursor-pointer"
          @input="$emit('setOpacity', $event.target.value / 100)"
        />
        <div class="flex items-center justify-between text-[10px]">
          <span class="text-[var(--ui-text-tertiary)]">混合模式</span>
          <select
            :value="selectedLayer?.blendMode || 'normal'"
            class="h-6 border border-[var(--ui-border)] rounded text-[10px] px-1 bg-[var(--ui-bg-base)] text-[var(--ui-text-primary)] outline-none cursor-pointer"
            @change="$emit('setBlendMode', $event.target.value)"
          >
            <option v-for="bm in blendModes" :key="bm.id" :value="bm.id">{{ bm.label }}</option>
          </select>
        </div>
      </div>
      <!-- 底部按钮 -->
      <div class="flex gap-0.5 px-2 py-1.5 border-t border-[var(--ui-border)]">
        <button
          class="flex-1 h-7 rounded-lg text-[10px] font-medium bg-[var(--ui-bg-tertiary)] hover:bg-[var(--ui-border)] transition-colors text-[var(--ui-text-secondary)]"
          @click="$emit('addLayer')"
        >
          + 新建
        </button>
        <button
          class="flex-1 h-7 rounded-lg text-[10px] font-medium bg-[var(--ui-bg-tertiary)] hover:bg-[var(--ui-border)] transition-colors text-[var(--ui-text-secondary)]"
          @click="$emit('removeLayer', currentLayerId)"
          :disabled="layers.length <= 1"
        >
          − 删除
        </button>
      </div>
    </div>

    <!-- ========== 色板面板 ========== -->
    <div v-if="activeTab === 'swatch'" class="flex-1 flex flex-col overflow-hidden">
      <div class="p-2 border-b border-[var(--ui-border)]">
        <select
          class="w-full h-7 border border-[var(--ui-border)] rounded-md text-[10px] px-1.5 bg-[var(--ui-bg-base)] text-[var(--ui-text-primary)] outline-none cursor-not-allowed opacity-50"
          disabled
          title="色板切换功能即将开放"
        >
          <option>官方色板</option>
          <option>自定义色板</option>
        </select>
      </div>
      <div class="flex-1 overflow-y-auto p-2">
        <h4 class="text-[10px] font-semibold text-[var(--ui-text-secondary)] mb-1.5">
          当前图纸颜色
        </h4>
        <div v-if="stats.length" class="space-y-0.5">
          <div
            v-for="s in stats"
            :key="s.hex"
            class="flex items-center gap-1.5 py-0.5 text-[10px] hover:bg-[var(--ui-bg-tertiary)] rounded px-1 cursor-pointer"
            @click="$emit('selectColor', s)"
          >
            <div
              class="w-3 h-3 rounded-sm ring-1 ring-black/10 flex-shrink-0"
              :style="{ background: s.hex }"
            />
            <span class="flex-1 truncate text-[var(--ui-text-primary)]">{{ s.name }}</span>
            <span class="font-mono text-[var(--ui-text-tertiary)]">{{ s.count }}颗</span>
          </div>
        </div>
        <div v-else class="text-[10px] text-[var(--ui-text-tertiary)] text-center py-4">
          暂无颜色数据
        </div>
      </div>
      <div class="flex gap-0.5 px-2 py-1.5 border-t border-[var(--ui-border)]">
        <button
          class="flex-1 h-7 rounded-lg text-[9px] bg-[var(--ui-bg-tertiary)] text-[var(--ui-text-tertiary)]"
          disabled
        >
          导入色板
        </button>
        <button
          class="flex-1 h-7 rounded-lg text-[9px] bg-[var(--ui-bg-tertiary)] text-[var(--ui-text-tertiary)]"
          disabled
        >
          导出色板
        </button>
      </div>
    </div>

    <!-- ========== 历史面板 ========== -->
    <div v-if="activeTab === 'history'" class="flex-1 flex flex-col overflow-hidden">
      <div class="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        <div
          v-for="(snap, i) in historyList"
          :key="i"
          class="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer transition-colors text-[10px]"
          :class="
            i === historyIdx
              ? 'bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] font-semibold'
              : 'text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-tertiary)]'
          "
          @click="$emit('jumpToHistory', i)"
        >
          <span class="font-mono text-[var(--ui-text-tertiary)] w-5 text-right flex-shrink-0">{{
            i + 1
          }}</span>
          <span class="flex-1 truncate">{{ getStepLabel(i) }}</span>
          <span v-if="i === historyIdx" class="text-[8px] text-[var(--ui-accent)]">当前</span>
        </div>
        <div
          v-if="historyList.length <= 1"
          class="text-[10px] text-[var(--ui-text-tertiary)] text-center py-8"
        >
          暂无操作记录
        </div>
      </div>
      <div class="px-2 py-1.5 border-t border-[var(--ui-border)]">
        <button
          class="w-full h-7 rounded-lg text-[10px] bg-[var(--ui-bg-tertiary)] hover:bg-[var(--ui-border)] transition-colors text-[var(--ui-text-secondary)]"
          @click="$emit('createSnapshot')"
        >
          📸 新建快照
        </button>
      </div>
    </div>

    <!-- ========== 属性面板 ========== -->
    <div v-if="activeTab === 'properties'" class="flex-1 overflow-y-auto p-3 space-y-3">
      <!-- 画布属性 -->
      <div>
        <h4
          class="text-[10px] font-semibold text-[var(--ui-text-tertiary)] uppercase tracking-wider mb-1.5"
        >
          画布
        </h4>
        <div class="space-y-1 text-[11px]">
          <div class="flex justify-between">
            <span class="text-[var(--ui-text-tertiary)]">尺寸</span>
            <span class="font-medium text-[var(--ui-text-primary)]">{{ gridW }} × {{ gridH }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[var(--ui-text-tertiary)]">总豆子数</span>
            <span class="font-medium text-[var(--ui-text-primary)]">{{ beadCount }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[var(--ui-text-tertiary)]">颜色数</span>
            <span class="font-medium text-[var(--ui-text-primary)]">{{ stats.length }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[var(--ui-text-tertiary)]">图层数</span>
            <span class="font-medium text-[var(--ui-text-primary)]">{{ layers.length }}</span>
          </div>
        </div>
      </div>
      <!-- 工具属性 -->
      <div>
        <h4
          class="text-[10px] font-semibold text-[var(--ui-text-tertiary)] uppercase tracking-wider mb-1.5"
        >
          工具
        </h4>
        <div class="space-y-1 text-[11px]">
          <div class="flex justify-between">
            <span class="text-[var(--ui-text-tertiary)]">当前工具</span>
            <span class="font-medium text-[var(--ui-text-primary)]">{{
              toolLabels[currentTool] || currentTool
            }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[var(--ui-text-tertiary)]">画笔大小</span>
            <span class="font-medium text-[var(--ui-text-primary)]">{{ brushSize }}px</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[var(--ui-text-tertiary)]">镜像模式</span>
            <span class="font-medium text-[var(--ui-text-primary)]">{{
              symLabels[symmetryMode]
            }}</span>
          </div>
        </div>
      </div>
      <!-- 撤销/重做状态 -->
      <div>
        <h4
          class="text-[10px] font-semibold text-[var(--ui-text-tertiary)] uppercase tracking-wider mb-1.5"
        >
          历史
        </h4>
        <div class="space-y-1 text-[11px]">
          <div class="flex justify-between">
            <span class="text-[var(--ui-text-tertiary)]">历史步数</span>
            <span class="font-medium text-[var(--ui-text-primary)]"
              >{{ historyIdx + 1 }} / {{ historyList.length }}</span
            >
          </div>
        </div>
      </div>
    </div>

  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  SearchIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  UnlockIcon,
} from 'lucide-vue-next'

const props = defineProps({
  // 标签页
  activeTab: { type: String, default: 'color' },

  // 颜色面板
  brand: { type: String, default: '全部' },
  seriesActive: { type: String, default: '' },
  brands: { type: Array, default: () => [] },
  seriesList: { type: Array, default: () => [] },
  colors: { type: Array, default: () => [] },
  curColor: { type: Object, default: null },
  brushSize: { type: Number, default: 1 },
  stats: { type: Array, default: () => [] },
  totalColorCount: { type: Number, default: 0 },
  brandColorCounts: { type: Object, default: () => ({}) },
  searchText: { type: String, default: '' },
  recentColors: { type: Array, default: () => [] },
  inventory: { type: Object, default: () => ({}) },
  warehouseOnly: { type: Boolean, default: false },

  // 图层面板
  layers: { type: Array, default: () => [] },
  currentLayerId: { type: String, default: null },
  blendModes: { type: Array, default: () => [{ id: 'normal', label: '正常' }] },
  maskEditMode: { type: Boolean, default: false },

  // 历史面板
  historyArr: { type: Array, default: () => [] },
  historyIdx: { type: Number, default: -1 },

  // AI 面板
  grid: { type: Array, default: () => [] },
  // 属性面板
  gridW: { type: Number, default: 58 },
  gridH: { type: Number, default: 58 },
  beadCount: { type: Number, default: 0 },
  currentTool: { type: String, default: 'brush' },
  symmetryMode: { type: String, default: 'none' },
})

const emit = defineEmits([
  'update:activeTab',
  'update:brand',
  'update:seriesActive',
  'update:searchText',
  'update:brushSize',
  'selectColor',
  'highlightColor',
  'update:warehouseOnly',
  'addLayer',
  'removeLayer',
  'selectLayer',
  'toggleVisibility',
  'toggleLock',
  'setOpacity',
  'setBlendMode',
  'addMask',
  'removeMask',
  'applyMask',
  'toggleMaskEdit',
  'jumpToHistory',
  'createSnapshot',
  'applyPalette',
])

const statsExpanded = ref(false)

/** 获取某颜色的库存量，未加载库存返回 null */
function getStock(colorId) {
  const qty = props.inventory[colorId]
  return qty != null ? qty : null
}

const selectedLayer = computed(
  () => props.layers.find((l) => l.id === props.currentLayerId) || null
)

const tabs = [
  { id: 'color', label: '🎨 颜色' },
  { id: 'layer', label: '📑 图层' },
  { id: 'swatch', label: '🎨 色板' },
  { id: 'history', label: '📜 历史' },
  { id: 'properties', label: '📐 属性' },
]

const toolLabels = {
  brush: '画笔',
  eraser: '橡皮',
  fill: '填充',
  picker: '吸色',
  select: '框选',
  replace: '替换',
  move: '移动',
  zoom: '缩放',
}

const symLabels = { none: '关闭', h: '水平', v: '垂直', quad: '四向' }

// 历史列表（反转显示，最新的在前）
const historyList = computed(() => props.historyArr)

// 图层缩略图颜色（取图层中第一个非空颜色）
function layerPreviewColor(layer) {
  if (!layer.grid) return null
  for (const row of layer.grid) {
    if (!row) continue
    for (const cell of row) {
      if (cell?.hex) return cell.hex
    }
  }
  return null
}

// 历史步骤标签
function getStepLabel(i) {
  if (i === 0) return '初始状态'
  return `步骤 ${i}`
}
</script>
