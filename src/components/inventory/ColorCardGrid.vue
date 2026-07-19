<!-- ============================================
  ColorCardGrid.vue — 豆仓色号卡片网格
  包含筛选栏 + 响应式卡片网格 + 入库弹窗
  替代原有的表格视图
  ============================================ -->
<template>
  <div class="flex flex-col h-full">
    <!-- 顶部操作栏 -->
    <div class="flex items-center justify-between mb-3 flex-shrink-0">
      <div class="flex items-center gap-2">
        <h2 class="text-lg font-bold">📦 珠子库存</h2>
        <span class="text-xs text-slate-400">
          {{ filteredList.length }}色
          <span v-if="inventory.length !== filteredList.length">/ {{ inventory.length }}色</span>
          · {{ totalBeads.toLocaleString() }}颗
        </span>
      </div>
      <div class="flex gap-2">
        <button class="btn-sm-outline" @click="$emit('scan')">📷 扫码</button>
        <button class="btn-sm-outline" @click="showAddDialog = true">+ 入库</button>
        <button class="btn-sm-outline" @click="$emit('export')">📥 CSV</button>
        <button class="btn-sm-outline" @click="refresh">🔄</button>
      </div>
    </div>

    <!-- 预警提示条 -->
    <div v-if="alertCount" class="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3 text-sm flex-shrink-0">
      <span class="font-semibold text-amber-700">⚠️ {{ alertCount }} 种颜色需补豆</span>
      <span class="text-amber-600 text-xs ml-1">
        ({{ outOfStockCount }}种用尽，{{ runningLowCount }}种偏低)
      </span>
    </div>

    <!-- 筛选栏 -->
    <div class="flex flex-wrap items-center gap-2 mb-3 flex-shrink-0">
      <!-- 搜索 -->
      <div class="relative flex-1 min-w-[140px] max-w-[220px]">
        <SearchIcon :size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="search" type="text" placeholder="搜索色号/名称..."
          class="w-full h-8 pl-8 pr-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-primary bg-white" />
      </div>

      <!-- 品牌 -->
      <select v-model="filterBrand" class="h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white outline-none">
        <option value="">全部品牌</option>
        <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
      </select>

      <!-- 色系 -->
      <select v-model="filterSeries" class="h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white outline-none">
        <option value="">全部色系</option>
        <option value="红">🔴 红</option><option value="橙">🟠 橙</option>
        <option value="黄">🟡 黄</option><option value="绿">🟢 绿</option>
        <option value="青">🩵 青</option><option value="蓝">🔵 蓝</option>
        <option value="紫">🟣 紫</option><option value="灰">⬜ 灰</option>
        <option value="棕">🟤 棕</option><option value="黑白">⚫ 黑白</option>
      </select>

      <!-- 颜色类型 -->
      <select v-model="filterType" class="h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white outline-none">
        <option value="0">全部类型</option>
        <option value="1">基础纯色</option>
        <option value="2">荧光色</option>
        <option value="3">透明色</option>
        <option value="4">金属色</option>
        <option value="5">夜光色</option>
        <option value="6">磨砂色</option>
      </select>

      <!-- 排序 -->
      <select v-model="sortBy" class="h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white outline-none">
        <option value="default">默认排序</option>
        <option value="qty-desc">库存↓</option>
        <option value="qty-asc">库存↑</option>
        <option value="name">色号排序</option>
      </select>
    </div>

    <!-- 卡片网格 -->
    <div v-if="filteredList.length" class="flex-1 overflow-y-auto">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        <div v-for="item in filteredList" :key="item.color_id"
          class="color-card group" :class="{
            'out-of-stock': item.min_threshold > 0 && item.quantity === 0,
            'low-stock': item.min_threshold > 0 && item.quantity > 0 && item.quantity <= item.min_threshold
          }"
          @click="$emit('select-color', item)">
          <!-- 色块 -->
          <div class="aspect-[4/3] rounded-t-lg relative overflow-hidden"
            :style="{ background: item.hex }"
            :class="{ 'opacity-40': item.quantity === 0 && item.min_threshold > 0 }">
            <!-- hover 快捷操作 -->
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100">
              <div class="flex gap-0.5">
                <button class="w-6 h-6 rounded-full bg-white/90 text-[10px] font-bold text-slate-600 flex items-center justify-center
                  hover:bg-white hover:text-primary transition-colors shadow-sm"
                  @click.stop="quickAdd(item, -10)">−</button>
                <button class="w-6 h-6 rounded-full bg-white/90 text-[10px] font-bold text-slate-600 flex items-center justify-center
                  hover:bg-white hover:text-primary transition-colors shadow-sm"
                  @click.stop="quickAdd(item, 10)">+</button>
              </div>
            </div>
          </div>
          <!-- 信息 -->
          <div class="px-2 py-1.5">
            <div class="text-[11px] font-semibold text-slate-700 truncate" :title="item.name">{{ item.name }}</div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-[10px] text-slate-400 font-mono">{{ item.hex }}</span>
              <span class="text-[11px] font-mono font-bold"
                :class="item.quantity === 0 && item.min_threshold > 0 ? 'text-red-500' : 'text-slate-600'">
                {{ item.quantity.toLocaleString() }}
              </span>
            </div>
            <div v-if="item.transit_quantity" class="text-[9px] text-amber-500 mt-0.5">
              +{{ item.transit_quantity }} 运输中
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="flex-1 flex items-center justify-center text-slate-400">
      <div class="text-center">
        <div class="text-5xl mb-3">{{ inventory.length ? '🔍' : '📦' }}</div>
        <p class="text-sm">{{ inventory.length ? '没有匹配的颜色，试试调整筛选条件' : '还没有库存记录，点击"+ 入库"添加珠子' }}</p>
      </div>
    </div>

    <!-- 入库弹窗 -->
    <Teleport to="body">
      <Transition name="dialog">
        <div v-if="showAddDialog" class="fixed inset-0 z-[150] flex items-center justify-center bg-black/30 backdrop-blur-sm"
          @click.self="showAddDialog = false">
          <div class="bg-white rounded-2xl shadow-xl p-5 w-[380px] max-w-[90vw] space-y-4 animate-bounce-in">
            <h3 class="font-bold text-slate-800">入库珠子</h3>
            <div class="space-y-2">
              <select v-model="addForm.colorId" class="w-full h-9 border border-slate-200 rounded-lg text-xs px-2 bg-slate-50">
                <option :value="null">选择颜色...</option>
                <optgroup v-for="bg in colorGroups" :key="bg.brand" :label="bg.brand">
                  <option v-for="c in bg.colors" :key="c.id" :value="c.id">{{ c.name }} {{ c.hex }}</option>
                </optgroup>
              </select>
              <div class="flex gap-2">
                <input v-model.number="addForm.quantity" type="number" min="1"
                  class="flex-1 h-9 border border-slate-200 rounded-lg text-xs px-2 text-center" placeholder="数量" />
                <input v-model.number="addForm.threshold" type="number" min="0"
                  class="w-20 h-9 border border-slate-200 rounded-lg text-xs px-2 text-center" placeholder="预警值" />
              </div>
              <input v-model="addForm.note" placeholder="备注（可选）"
                class="w-full h-9 border border-slate-200 rounded-lg text-xs px-2" />
            </div>
            <div class="flex gap-2">
              <button class="flex-1 h-9 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium" @click="showAddDialog = false">取消</button>
              <button class="flex-1 h-9 rounded-xl bg-primary text-white text-xs font-medium" @click="doAddStock">确认入库</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search as SearchIcon } from 'lucide-vue-next'
import API from '@/api/index.js'
import { useToast } from '@/composables/useToast.js'

const emit = defineEmits(['select-color', 'scan', 'export', 'updated'])

const toast = useToast()

// 数据
const inventory = ref([])
const allColors = ref([])
const alerts = ref([])

// 筛选状态
const search = ref('')
const filterBrand = ref('')
const filterSeries = ref('')
const filterType = ref('0')
const sortBy = ref('default')

// 入库弹窗
const showAddDialog = ref(false)
const addForm = ref({ colorId: null, quantity: 100, threshold: 0, note: '' })

// 推导
const brands = computed(() => [...new Set(inventory.value.map(i => i.brand).filter(Boolean))].sort())
const alertCount = computed(() => alerts.value.length)
const outOfStockCount = computed(() => alerts.value.filter(i => i.quantity === 0).length)
const runningLowCount = computed(() => alerts.value.filter(i => i.quantity > 0).length)
const totalBeads = computed(() => inventory.value.reduce((s, i) => s + (i.quantity || 0), 0))

// 色系推断（基于颜色名称中的色系关键词）
function inferSeries(name, series) {
  const t = (name + ' ' + (series || '')).toLowerCase()
  if (/红|red|pink|rose|cerise|claret|burgundy|plum/i.test(t) && !/暗红|深红/.test(t)) return '红'
  if (/橙|orange|apricot|peach|nougat|tan|copper|amber/i.test(t)) return '橙'
  if (/黄|yellow|gold|lemon|lime|cream|beige|honey|sand|wheat/i.test(t)) return '黄'
  if (/绿|green|olive|forest|mint|teal|jade|emerald|eucalyptus/i.test(t)) return '绿'
  if (/青|cyan/i.test(t)) return '青'
  if (/蓝|blue|azure|navy|cobalt|sky|turquoise|petrol|indigo|cornflower/i.test(t)) return '蓝'
  if (/紫|purple|violet|lavender|lilac|mauve|orchid|amethyst/i.test(t)) return '紫'
  if (/灰|grey|gray|silver|cloudy|smoke|dust/i.test(t)) return '灰'
  if (/棕|brown|chocolate|cocoa|coffee|wood|cinnamon|caramel/i.test(t)) return '棕'
  if (/黑|白|black|white|ebony|ivory|snow|pearl|ghost/i.test(t)) return '黑白'
  return ''
}

// 颜色分组（用于入库弹窗下拉）
const colorGroups = computed(() => {
  const map = {}
  for (const c of allColors.value) {
    const b = c.brand || '其他'
    if (!map[b]) map[b] = []
    map[b].push(c)
  }
  return Object.entries(map).map(([brand, colors]) => ({ brand, colors }))
})

// 筛选 + 排序
const filteredList = computed(() => {
  let list = [...inventory.value]

  // 搜索
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.hex || '').toLowerCase().includes(q) ||
      (i.brand || '').toLowerCase().includes(q)
    )
  }

  // 品牌
  if (filterBrand.value) {
    list = list.filter(i => i.brand === filterBrand.value)
  }

  // 色系
  if (filterSeries.value) {
    list = list.filter(i => inferSeries(i.name, i.series) === filterSeries.value)
  }

  // 类型（需要从 allColors 关联 color_type）
  if (filterType.value !== '0') {
    const typeMap = {}
    for (const c of allColors.value) typeMap[c.id] = c.color_type || 1
    list = list.filter(i => String(typeMap[i.color_id] || 1) === filterType.value)
  }

  // 排序
  if (sortBy.value === 'qty-desc') list.sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
  else if (sortBy.value === 'qty-asc') list.sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
  else if (sortBy.value === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  return list
})

// 方法
async function refresh() {
  await Promise.all([loadInventory(), loadAlerts()])
}

async function loadInventory() {
  try {
    const res = await API.get('/api/inventory', true)
    if (res.code === 200) {
      inventory.value = res.data?.items || []
    }
  } catch (e) { toast.show('加载库存失败') }
}

async function loadAllColors() {
  try {
    const res = await API.get('/api/beads/colors')
    if (res.code === 200) allColors.value = res.data || []
  } catch (_) {}
}

async function loadAlerts() {
  try {
    const res = await API.get('/api/inventory/alerts', true)
    if (res.code === 200) alerts.value = res.data?.items || []
  } catch (_) {}
}

async function quickAdd(item, delta) {
  const newQty = Math.max(0, (item.quantity || 0) + delta)
  try {
    await API.put(`/api/inventory/${item.color_id}`, { quantity: newQty }, true)
    item.quantity = newQty
    emit('updated')
  } catch (e) { toast.show('调整失败') }
}

async function doAddStock() {
  if (!addForm.value.colorId) { toast.show('请选择颜色'); return }
  if (!addForm.value.quantity || addForm.value.quantity <= 0) { toast.show('请输入有效数量'); return }
  try {
    const res = await API.post('/api/inventory', {
      colorId: parseInt(addForm.value.colorId),
      quantity: parseInt(addForm.value.quantity),
      minThreshold: addForm.value.threshold || 0,
      note: addForm.value.note || ''
    }, true)
    if (res.code === 200) {
      toast.show(`入库 ${addForm.value.quantity} 颗`)
      showAddDialog.value = false
      addForm.value = { colorId: null, quantity: 100, threshold: 0, note: '' }
      await refresh()
    } else {
      toast.show(res.message || '入库失败')
    }
  } catch (e) { toast.show(e.message || '入库失败，请稍后重试') }
}

onMounted(async () => {
  await Promise.all([loadInventory(), loadAlerts(), loadAllColors()])
})

defineExpose({ refresh })
</script>

<style scoped>
.color-card {
  @apply bg-white rounded-lg border border-slate-100 overflow-hidden
         cursor-pointer transition-all duration-150
         hover:shadow-md hover:-translate-y-0.5
         active:scale-[0.98];
}
.color-card.out-of-stock {
  @apply border-red-200 bg-red-50/30;
}
.color-card.low-stock {
  @apply border-amber-200 bg-amber-50/20;
}
.btn-sm-outline {
  @apply h-7 px-3 rounded-lg text-[11px] font-medium border border-slate-200 text-slate-500
         hover:bg-slate-50 transition-colors cursor-pointer;
}
.dialog-enter-active, .dialog-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-enter-from, .dialog-leave-to { opacity: 0; }
</style>
