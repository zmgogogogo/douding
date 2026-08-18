<!-- ============================================
  BatchAddDialog.vue — 批量入库弹窗
  品牌标签筛选 + 分组折叠 + 多选批量入库
  ============================================ -->
<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
        <div class="dialog-panel">
          <!-- 头部 -->
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-base font-bold text-slate-800">➕ 批量入库</h3>
            <button
              class="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center"
              @click="$emit('close')"
            >
              <XIcon :size="16" class="text-slate-400" />
            </button>
          </div>

          <!-- 搜索 -->
          <div class="relative mb-3">
            <SearchIcon
              :size="14"
              class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索颜色或色号…"
              class="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-primary"
            />
          </div>

          <!-- 品牌标签栏 -->
          <div class="flex gap-1 mb-2 overflow-x-auto scrollbar-hide flex-shrink-0">
            <button
              class="brand-tab"
              :class="{ active: activeBrand === null }"
              @click="activeBrand = null"
            >全部</button>
            <button
              v-for="b in brands"
              :key="b"
              class="brand-tab"
              :class="{ active: activeBrand === b }"
              @click="activeBrand = b"
            >
              {{ b.length > 5 ? b.slice(0, 5) + '…' : b }}
            </button>
          </div>

          <!-- 已选标签 — 超过 8 个时折叠，防止撑爆布局 -->
          <div v-if="selected.size" class="mb-2 flex-shrink-0">
            <div class="flex flex-wrap gap-1">
              <span
                v-for="id in visibleSelectedIds"
                :key="id"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium"
              >
                {{ colorMap[id]?.name || id }}
                <button
                  class="w-3.5 h-3.5 rounded-full hover:bg-primary/20 flex items-center justify-center"
                  @click.stop="toggleSelect(id)"
                >×</button>
              </span>
            </div>
            <!-- 折叠/展开 + 清空 -->
            <div v-if="selected.size > MAX_VISIBLE_TAGS || showAllSelected" class="flex items-center gap-2 mt-1">
              <button
                v-if="selected.size > MAX_VISIBLE_TAGS"
                class="text-[10px] text-primary font-medium hover:underline"
                @click="showAllSelected = !showAllSelected"
              >
                {{ showAllSelected ? '收起' : `展开全部 ${selected.size} 种` }}
              </button>
              <button
                class="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                @click="clearAllSelected"
              >清空已选</button>
            </div>
            <!-- 展开模式下可滚动的完整列表 -->
            <div
              v-if="showAllSelected && selected.size > MAX_VISIBLE_TAGS"
              class="flex flex-wrap gap-1 mt-1 max-h-24 overflow-y-auto"
            >
              <span
                v-for="id in hiddenSelectedIds"
                :key="id"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium"
              >
                {{ colorMap[id]?.name || id }}
                <button
                  class="w-3.5 h-3.5 rounded-full hover:bg-primary/20 flex items-center justify-center"
                  @click.stop="toggleSelect(id)"
                >×</button>
              </span>
            </div>
          </div>

          <!-- 品牌分组列表 -->
          <div class="flex-1 overflow-y-auto min-h-0 mb-3 border border-slate-100 rounded-xl">
            <div v-for="group in groupedColors" :key="group.brand">
              <!-- 品牌分组标题 -->
              <button
                class="w-full flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 transition-colors sticky top-0 z-10 border-b border-slate-100"
                @click="toggleBrandCollapse(group.brand)"
              >
                <ChevronRightIcon
                  :size="12"
                  class="text-slate-400 transition-transform flex-shrink-0"
                  :class="{ 'rotate-90': !collapsedBrands.has(group.brand) }"
                />
                <span class="text-[11px] font-semibold text-slate-600">{{ group.brand }}</span>
                <span class="text-[10px] text-slate-400">{{ group.colors.length }}色</span>
                <!-- 全选此品牌 -->
                <span class="flex-1" />
                <button
                  class="text-[10px] text-primary font-medium hover:underline flex-shrink-0"
                  @click.stop="selectAllInGroup(group)"
                >
                  {{ isGroupAllSelected(group) ? '取消全选' : '全选' }}
                </button>
              </button>

              <!-- 颜色列表 -->
              <div v-if="!collapsedBrands.has(group.brand)">
                <div
                  v-for="c in group.colors"
                  :key="c.id"
                  class="flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 cursor-pointer transition-colors"
                  :class="{ 'bg-primary/5': selected.has(c.id) }"
                  @click="toggleSelect(c.id)"
                >
                  <div
                    class="w-5 h-5 rounded-md ring-1 ring-black/10 flex-shrink-0"
                    :style="{ background: c.hex }"
                  />
                  <span class="text-[11px] text-slate-700 flex-1 truncate">{{ c.name }}</span>
                  <span class="text-[10px] text-slate-400 font-mono flex-shrink-0">{{ c.hex }}</span>
                  <div
                    class="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                    :class="selected.has(c.id) ? 'bg-primary border-primary' : 'border-slate-300'"
                  >
                    <CheckIcon v-if="selected.has(c.id)" :size="10" class="text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="!groupedColors.length"
              class="py-12 text-center text-xs text-slate-400"
            >
              没有匹配的颜色
            </div>
          </div>

          <!-- 操作区 -->
          <div class="text-xs text-slate-400 mb-2 flex-shrink-0">
            已选 <span class="font-bold text-slate-700">{{ selected.size }}</span> 种颜色
          </div>
          <div class="flex gap-2 mb-3 flex-shrink-0">
            <input
              v-model.number="batchQty"
              type="number"
              min="1"
              class="flex-1 h-10 rounded-xl border border-slate-200 text-center text-sm font-bold outline-none focus:border-primary"
              placeholder="输入数量（颗）"
            />
          </div>

          <div class="flex gap-2 flex-shrink-0">
            <button
              class="flex-1 h-10 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium"
              @click="$emit('close')"
            >取消</button>
            <button
              class="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
              :disabled="selected.size === 0 || !batchQty || submitting"
              @click="doBatchAdd"
            >
              {{ submitting ? '提交中…' : `批量入库 ${selected.size > 0 ? (batchQty || 0) * selected.size : 0} 颗` }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  X as XIcon,
  Search as SearchIcon,
  Check as CheckIcon,
  ChevronRight as ChevronRightIcon,
} from 'lucide-vue-next'
import API from '@/api/index.js'
import { useToast } from '@/composables/useToast.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'done'])

const toast = useToast()

const allColors = ref([])
const selected = ref(new Set())
const searchQuery = ref('')
const batchQty = ref(100)
const submitting = ref(false)
const activeBrand = ref(null) // null = 全部
const collapsedBrands = ref(new Set()) // 折叠的品牌集合
const showAllSelected = ref(false) // 是否展开全部已选标签

const MAX_VISIBLE_TAGS = 8

/** 已选ID数组 */
const selectedIds = computed(() => [...selected.value])

/** 折叠时可见的前 N 个标签 */
const visibleSelectedIds = computed(() =>
  showAllSelected.value ? selectedIds.value : selectedIds.value.slice(0, MAX_VISIBLE_TAGS)
)

/** 展开模式下额外显示的剩余标签 */
const hiddenSelectedIds = computed(() =>
  showAllSelected.value ? [] : selectedIds.value.slice(MAX_VISIBLE_TAGS)
)

const colorMap = computed(() => {
  const map = {}
  for (const c of allColors.value) map[c.id] = c
  return map
})

/** 从颜色列表提取唯一品牌，按颜色数量降序 */
const brands = computed(() => {
  const count = {}
  for (const c of allColors.value) {
    const b = c.brand || '其他'
    count[b] = (count[b] || 0) + 1
  }
  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
})

/** 分组后的颜色列表（品牌筛选 + 搜索过滤） */
const groupedColors = computed(() => {
  let list = allColors.value

  // 品牌筛选
  if (activeBrand.value) {
    list = list.filter(c => c.brand === activeBrand.value)
  }

  // 搜索过滤
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.hex || '').toLowerCase().includes(q)
    )
  }

  // 按品牌分组
  const groups = {}
  for (const c of list) {
    const b = c.brand || '其他'
    if (!groups[b]) groups[b] = []
    groups[b].push(c)
  }

  // 按颜色数量降序排列品牌，每组内按色号自然排序
  return Object.entries(groups)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([brand, colors]) => ({
      brand,
      colors: colors.sort((a, b) =>
        String(a.name).localeCompare(String(b.name), undefined, { numeric: true })
      ),
    }))
})

watch(
  () => props.visible,
  async (vis) => {
    if (!vis) return
    selected.value = new Set()
    searchQuery.value = ''
    batchQty.value = 100
    activeBrand.value = null
    collapsedBrands.value = new Set()
    showAllSelected.value = false
    if (!allColors.value.length) await loadColors()
  }
)

function toggleSelect(id) {
  const s = new Set(selected.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selected.value = s
}

function clearAllSelected() {
  selected.value = new Set()
  showAllSelected.value = false
}

function toggleBrandCollapse(brand) {
  const s = new Set(collapsedBrands.value)
  if (s.has(brand)) s.delete(brand)
  else s.add(brand)
  collapsedBrands.value = s
}

/** 某品牌分组是否全部被选中 */
function isGroupAllSelected(group) {
  return group.colors.length > 0 && group.colors.every(c => selected.value.has(c.id))
}

/** 全选/取消全选某品牌分组 */
function selectAllInGroup(group) {
  const s = new Set(selected.value)
  if (isGroupAllSelected(group)) {
    // 取消全选
    for (const c of group.colors) s.delete(c.id)
  } else {
    // 全选
    for (const c of group.colors) s.add(c.id)
  }
  selected.value = s
}

async function loadColors() {
  try {
    const res = await API.get('/api/beads/colors')
    if (res.code === 200) allColors.value = res.data || []
  } catch (_) {}
}

async function doBatchAdd() {
  if (selected.value.size === 0 || !batchQty.value) return
  submitting.value = true
  try {
    const items = [...selected.value].map(id => ({
      colorId: parseInt(id),
      num: parseInt(batchQty.value),
    }))
    const res = await API.post('/api/stock/batch-add', { items }, true)
    if (res.code === 200) {
      toast.show(res.message || '批量入库完成')
      emit('done')
      emit('close')
    } else {
      toast.show(res.message || '批量入库失败')
    }
  } catch (e) {
    toast.show('批量入库失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.dialog-overlay {
  @apply fixed inset-0 z-[150] flex items-center justify-center bg-black/30 backdrop-blur-sm;
}
.dialog-panel {
  @apply bg-white rounded-2xl shadow-xl p-5 w-[440px] max-w-[94vw] max-h-[88vh] flex flex-col overflow-hidden;
}

/* 品牌标签 */
.brand-tab {
  @apply px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap flex-shrink-0
         text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors;
}
.brand-tab.active {
  @apply bg-primary/10 text-primary;
}

/* 隐藏滚动条 */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
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
