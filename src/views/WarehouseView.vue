<!-- ============================================
  WarehouseView.vue — 豆仓 V3.0
  按 .claude/豆仓.md 文档 7 层结构重构
  ============================================ -->
<template>
  <div class="flex flex-col h-full bg-slate-50" v-if="auth.isLoggedIn.value">
    <!-- ====== 1. 顶部导航栏 ====== -->
    <div class="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 flex-shrink-0">
      <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors" @click="$router.back()">
        <ChevronLeftIcon :size="20" class="text-slate-600" />
      </button>
      <h1 class="text-base font-bold text-slate-800">我的豆仓</h1>
      <div class="w-8" />
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- ====== 2. 数据总览区 ====== -->
      <div class="grid grid-cols-3 gap-3 px-4 py-4">
        <div class="overview-card" :class="{ active: activeFilter === 'all' && !ownedOnly }" @click="activeFilter = 'all'; ownedOnly = false">
          <div class="overview-num text-slate-800">{{ overview.totalBeads?.toLocaleString() || 0 }}</div>
          <div class="overview-label">总豆子数量</div>
        </div>
        <div class="overview-card" :class="{ active: ownedOnly }" @click="ownedOnly = !ownedOnly; if (ownedOnly) activeFilter = 'all'">
          <div class="overview-num text-emerald-500">{{ overview.ownedColors || 0 }}</div>
          <div class="overview-label">已拥有颜色</div>
        </div>
        <div class="overview-card" :class="{ active: activeFilter === 'out' }" @click="activeFilter = activeFilter === 'out' ? 'all' : 'out'; ownedOnly = false">
          <div class="overview-num" :class="overview.outOfStock > 0 ? 'text-red-500' : 'text-slate-400'">
            {{ overview.outOfStock || 0 }}
          </div>
          <div class="overview-label">当前缺货</div>
        </div>
      </div>

      <!-- ====== 3. 功能按钮区 ====== -->
      <div class="flex gap-2 px-4 pb-4">
        <button class="action-btn" @click="showLackList = true">
          <span class="text-lg">📋</span>
          <span>缺料清单</span>
          <span v-if="lackCount" class="action-badge">{{ lackCount }}</span>
        </button>
        <button class="action-btn" @click="showStockLog = true">
          <span class="text-lg">📜</span>
          <span>库存流水</span>
        </button>
        <button class="action-btn" @click="showBatchAdd = true">
          <span class="text-lg">➕</span>
          <span>批量添加</span>
        </button>
      </div>

      <!-- ====== 4. 搜索框 + 品牌筛选 ====== -->
      <div class="flex gap-2 px-4 pb-3">
        <div class="relative flex-1 max-w-[180px]">
          <SearchIcon :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            v-model="searchInput"
            type="text"
            placeholder="搜索色号/名称…"
            class="search-input"
          />
          <button
            v-if="searchInput"
            class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center"
            @click="searchInput = ''"
          >
            <XIcon :size="12" class="text-slate-500" />
          </button>
        </div>
        <select
          v-model="filterBrand"
          class="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 outline-none flex-shrink-0"
        >
          <option value="">全部品牌</option>
          <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
        </select>
      </div>

      <!-- ====== 5. 状态标签筛选栏 ====== -->
      <div class="flex gap-2 px-4 pb-3 overflow-x-auto flex-shrink-0">
        <button
          v-for="tab in filterTabs"
          :key="tab.key"
          class="filter-tab"
          :class="{ active: activeFilter === tab.key }"
          :style="activeFilter === tab.key ? { background: tab.color + '18', color: tab.color, borderColor: tab.color + '40' } : {}"
          @click="activeFilter = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- ====== 6. 豆子网格列表（2列自适应） ====== -->
      <div class="px-4 pb-4">
        <!-- 加载中 -->
        <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400 text-sm">
          加载中…
        </div>

        <!-- 搜索无结果 -->
        <div v-else-if="filteredList.length === 0 && debouncedSearch" class="empty-state">
          <div class="text-5xl mb-3">🔍</div>
          <p class="text-sm font-medium text-slate-500 mb-1">未找到匹配的颜色</p>
          <p class="text-xs text-slate-400">试试其他关键词</p>
        </div>

        <!-- 筛选无结果 -->
        <div v-else-if="filteredList.length === 0 && activeFilter === 'out'" class="empty-state">
          <div class="text-5xl mb-3">🎉</div>
          <p class="text-sm font-medium text-slate-500 mb-1">暂无缺货颜色</p>
          <p class="text-xs text-slate-400">库存状态良好</p>
        </div>

        <div v-else-if="filteredList.length === 0 && activeFilter === 'low'" class="empty-state">
          <div class="text-5xl mb-3">✅</div>
          <p class="text-sm font-medium text-slate-500 mb-1">暂无紧张库存</p>
          <p class="text-xs text-slate-400">所有颜色库存充足</p>
        </div>

        <!-- 网格 -->
        <div v-else class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(172px, 1fr));">
          <div
            v-for="item in filteredList"
            :key="item.colorId"
            class="bead-card"
            :class="{ 'card-unowned': item.status === 'unowned' }"
            @click="openColorDetail(item)"
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
                <span class="text-[11px] font-bold text-slate-700 truncate flex-1">{{ item.colorCode }}</span>
                <button
                  class="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
                  @click.stop="openDetail(item)"
                >
                  <SettingsIcon :size="11" />
                </button>
              </div>
              <div class="text-[10px] text-slate-400 truncate mb-1.5">{{ item.colorName }}</div>
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold" :style="{ color: statusColor(item.status) }">
                  {{ item.status === 'unowned' ? '未拥有' : item.stockNum.toLocaleString() + ' 颗' }}
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

    </div>

    <!-- ====== 弹窗组件 ====== -->
    <LackListDialog :visible="showLackList" @close="showLackList = false" />
    <StockLogDialog :visible="showStockLog" @close="showStockLog = false" />
    <BatchAddDialog :visible="showBatchAdd" @close="showBatchAdd = false" @done="refreshAll" />
    <ColorDetailDialog
      :color-id="detailColorId"
      :visible="showDetail"
      :inventory-item="detailItem"
      @close="showDetail = false"
      @updated="onDetailUpdated"
    />
  </div>
  <div v-else class="flex items-center justify-center h-full text-slate-400 text-sm">
    请先登录后查看豆仓
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search as SearchIcon, ChevronLeft as ChevronLeftIcon, X as XIcon, Settings as SettingsIcon } from 'lucide-vue-next'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'
import LackListDialog from '@/components/inventory/LackListDialog.vue'
import StockLogDialog from '@/components/inventory/StockLogDialog.vue'
import BatchAddDialog from '@/components/inventory/BatchAddDialog.vue'
import ColorDetailDialog from '@/components/inventory/ColorDetailDialog.vue'

const auth = useAuth()
const router = useRouter()
const toast = useToast()

// ====== 数据 ======
const stockList = ref([])
const overview = ref({ totalBeads: 0, ownedColors: 0, outOfStock: 0 })
const loading = ref(true)

// ====== 筛选状态 ======
const searchInput = ref('')
const debouncedSearch = ref('')
const activeFilter = ref('all')
const filterBrand = ref('')
const ownedOnly = ref(false)
let debounceTimer = null

const filterTabs = [
  { key: 'all', label: '全部', color: '#64748b' },
  { key: 'sufficient', label: '充足', color: '#00b42a' },
  { key: 'low', label: '紧张', color: '#ff7d00' },
  { key: 'out', label: '缺货', color: '#f53f3f' },
]

// ====== 弹窗开关 ======
const showLackList = ref(false)
const showStockLog = ref(false)
const showBatchAdd = ref(false)
const showDetail = ref(false)
const detailColorId = ref(null)
const detailItem = ref(null)

// ====== 长按连续加减 ======
let longPressTimer = null
let repeatTimer = null

function startContinuous(item, delta) {
  // 未拥有颜色禁止减号
  if (delta < 0 && item.status === 'unowned') return
  // 库存为0时禁止减号
  if (delta < 0 && item.stockNum <= 0) return

  // 立即执行一次
  adjustStock(item, delta)

  // 400ms 后开始连续
  longPressTimer = setTimeout(() => {
    repeatTimer = setInterval(() => {
      // 检查是否已到边界
      if (delta < 0 && item.stockNum <= 0) {
        stopContinuous()
        return
      }
      adjustStock(item, delta)
    }, 80)
  }, 400)
}

function stopContinuous() {
  clearTimeout(longPressTimer)
  clearInterval(repeatTimer)
  longPressTimer = null
  repeatTimer = null
}

// 组件卸载时清理
onUnmounted(() => {
  stopContinuous()
})

// ====== 实时搜索防抖 ======
watch(searchInput, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = val
  }, 300)
})

// ====== 计算属性 ======
const brands = computed(() => {
  return [...new Set(stockList.value.map(i => i.brand).filter(Boolean))].sort()
})

const lackCount = computed(() => {
  return stockList.value.filter(i => i.status === 'out' || i.status === 'low').length
})

const filteredList = computed(() => {
  let list = stockList.value

  // 已拥有筛选（库存 > 0）
  if (ownedOnly.value) {
    list = list.filter(i => i.stockNum > 0)
  }

  // 状态筛选
  if (activeFilter.value !== 'all') {
    const target = activeFilter.value
    list = list.filter(i => i.status === target)
  }

  // 品牌筛选
  if (filterBrand.value) {
    list = list.filter(i => i.brand === filterBrand.value)
  }

  // 搜索（使用防抖后的值）
  if (debouncedSearch.value) {
    const q = debouncedSearch.value.toLowerCase()
    list = list.filter(i =>
      (i.colorName || '').toLowerCase().includes(q) ||
      (i.colorHex || '').toLowerCase().includes(q) ||
      (i.colorCode || '').toLowerCase().includes(q)
    )
  }

  return list
})

// ====== 工具函数 ======
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

// ====== 数据加载 ======
async function loadStockList() {
  try {
    const res = await API.get('/api/stock/list', true)
    if (res.code === 200) {
      stockList.value = res.data?.items || []
      overview.value = res.data?.overview || { totalBeads: 0, ownedColors: 0, outOfStock: 0 }
    }
  } catch (e) {
    toast.show('加载库存失败')
  } finally {
    loading.value = false
  }
}

// ====== 库存调整（乐观更新 + 失败回滚） ======
async function adjustStock(item, delta) {
  const prevStock = item.stockNum
  const prevStatus = item.status

  // 边界检查
  const newStock = Math.max(0, prevStock + delta)
  if (newStock === prevStock) return

  // 乐观更新
  item.stockNum = newStock
  item.isNewRecord = false
  item.status = computeStatusLocal(item)

  try {
    const res = await API.post('/api/stock/update', { colorId: item.colorId, delta }, true)
    if (res.code === 200 && res.data) {
      // 成功后用服务端数据校准
      item.stockNum = res.data.afterStock
      item.status = res.data.status
      // 更新总览
      await refreshOverview()
    }
  } catch (e) {
    // 失败回滚
    item.stockNum = prevStock
    item.status = prevStatus
    toast.show('调整失败，请稍后重试')
  }
}

function computeStatusLocal(item) {
  if (item.isNewRecord && item.stockNum === 0) return 'unowned'
  if (item.stockNum === 0) return 'out'
  if (item.stockNum <= item.warnNum) return 'low'
  return 'sufficient'
}

async function refreshOverview() {
  try {
    const res = await API.get('/api/stock/overview', true)
    if (res.code === 200) {
      overview.value = res.data
    }
  } catch (_) {}
}

// ====== 卡片详情 ======
function openDetail(item) {
  detailColorId.value = item.colorId
  detailItem.value = { color_id: item.colorId, quantity: item.stockNum, min_threshold: item.warnNum, name: item.colorName, hex: item.colorHex, brand: item.brand, series: item.series }
  showDetail.value = true
}

function onDetailUpdated() {
  refreshAll()
}

// ====== 生命周期 ======
onMounted(async () => {
  if (!auth.isLoggedIn.value) return
  await refreshAll()
})

async function refreshAll() {
  await loadStockList()
}
</script>

<style scoped>
/* ====== 总览卡片 ====== */
.overview-card {
  @apply bg-white rounded-xl border-2 border-slate-100 p-3 text-center cursor-pointer transition-colors;
}
.overview-card.active {
  @apply border-primary bg-primary/5;
}
.overview-num {
  @apply text-xl font-bold;
}
.overview-label {
  @apply text-[10px] text-slate-400 mt-0.5;
}

/* ====== 功能按钮 ====== */
.action-btn {
  @apply flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl
         bg-white border border-slate-200 text-xs font-medium text-slate-600
         hover:bg-slate-50 active:scale-[0.98] transition-all relative;
}
.action-badge {
  @apply absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white
         text-[10px] flex items-center justify-center font-bold px-1;
}

/* ====== 搜索 ====== */
.search-input {
  @apply w-full h-10 pl-9 pr-8 rounded-xl border border-slate-200 bg-white
         text-sm outline-none transition-colors
         focus:border-primary focus:ring-2 focus:ring-primary/10;
}

/* ====== 筛选标签 ====== */
.filter-tab {
  @apply px-4 h-8 rounded-full text-xs font-medium border border-slate-200
         bg-white text-slate-500 whitespace-nowrap transition-all
         hover:bg-slate-50 active:scale-95;
}
.filter-tab.active {
  @apply font-semibold;
}

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
.swatch-unowned-icon {
  @apply absolute inset-0 flex items-center justify-center text-2xl text-slate-400 font-light;
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

/* ====== 空状态 ====== */
.empty-state {
  @apply text-center py-16;
}

/* ====== 底部设置 ====== */
.toggle-switch {
  @apply w-11 h-6 rounded-full bg-slate-300 relative transition-colors duration-200;
}
.toggle-switch::after {
  content: '';
  @apply absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200;
}
.toggle-switch.on {
  @apply bg-primary;
}
.toggle-switch.on::after {
  transform: translateX(20px);
}
.loss-slider {
  @apply w-20 h-1.5 rounded-full appearance-none bg-slate-200 outline-none;
}
.loss-slider::-webkit-slider-thumb {
  @apply appearance-none w-4 h-4 rounded-full bg-primary shadow cursor-pointer;
}

/* ====== 弹窗 ====== */
.dialog-overlay {
  @apply fixed inset-0 z-[150] flex items-center justify-center bg-black/30 backdrop-blur-sm;
}
.dialog-panel {
  @apply bg-white rounded-2xl shadow-xl p-5 w-[380px] max-w-[90vw] max-h-[80vh] overflow-y-auto;
}
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
</style>
