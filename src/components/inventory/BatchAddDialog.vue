<!-- ============================================
  BatchAddDialog.vue — 批量入库弹窗（V3.0）
  多选颜色 + 统一数量 → 一次性批量入库
  ============================================ -->
<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
        <div class="dialog-panel">
          <!-- 头部 -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-slate-800">➕ 批量入库</h3>
            <button class="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center" @click="$emit('close')">
              <XIcon :size="16" class="text-slate-400" />
            </button>
          </div>

          <!-- 搜索 -->
          <div class="relative mb-3">
            <SearchIcon :size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索颜色…"
              class="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 text-xs outline-none"
            />
          </div>

          <!-- 已选标签 -->
          <div v-if="selected.size" class="flex flex-wrap gap-1 mb-3">
            <span
              v-for="id in [...selected]"
              :key="id"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium"
            >
              {{ colorMap[id]?.name || id }}
              <button class="w-3.5 h-3.5 rounded-full hover:bg-primary/20 flex items-center justify-center" @click="toggleSelect(id)">×</button>
            </span>
          </div>

          <!-- 颜色列表 -->
          <div class="max-h-[40vh] overflow-y-auto space-y-0.5 mb-4 border border-slate-100 rounded-xl">
            <div
              v-for="c in filteredColors"
              :key="c.id"
              class="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors"
              :class="{ 'bg-primary/5': selected.has(c.id) }"
              @click="toggleSelect(c.id)"
            >
              <div
                class="w-5 h-5 rounded-md ring-1 ring-black/10 flex-shrink-0"
                :style="{ background: c.hex }"
              />
              <span class="text-xs text-slate-700 flex-1 truncate">{{ c.name }}</span>
              <span class="text-[10px] text-slate-400 font-mono">{{ c.hex }}</span>
              <div
                class="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                :class="selected.has(c.id) ? 'bg-primary border-primary' : 'border-slate-300'"
              >
                <CheckIcon v-if="selected.has(c.id)" :size="10" class="text-white" />
              </div>
            </div>
          </div>

          <!-- 操作区 -->
          <div class="text-xs text-slate-400 mb-2">
            已选 <span class="font-bold text-slate-700">{{ selected.size }}</span> 种颜色
          </div>
          <div class="flex gap-2 mb-3">
            <input
              v-model.number="batchQty"
              type="number"
              min="1"
              class="flex-1 h-10 rounded-xl border border-slate-200 text-center text-sm font-bold outline-none focus:border-primary"
              placeholder="输入数量（颗）"
            />
          </div>

          <div class="flex gap-2">
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
import { X as XIcon, Search as SearchIcon, Check as CheckIcon } from 'lucide-vue-next'
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

const colorMap = computed(() => {
  const map = {}
  for (const c of allColors.value) map[c.id] = c
  return map
})

const filteredColors = computed(() => {
  if (!searchQuery.value) return allColors.value
  const q = searchQuery.value.toLowerCase()
  return allColors.value.filter(c =>
    (c.name || '').toLowerCase().includes(q) || (c.hex || '').toLowerCase().includes(q)
  )
})

watch(() => props.visible, async (vis) => {
  if (!vis) return
  selected.value = new Set()
  searchQuery.value = ''
  batchQty.value = 100
  if (!allColors.value.length) await loadColors()
})

function toggleSelect(id) {
  const s = new Set(selected.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
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
    const items = [...selected.value].map(id => ({ colorId: parseInt(id), num: parseInt(batchQty.value) }))
    const res = await API.post('/api/stock/batch-add', { items }, true)
    if (res.code === 200) {
      toast.show(res.message || `批量入库完成`)
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
  @apply bg-white rounded-2xl shadow-xl p-5 w-[400px] max-w-[92vw] max-h-[85vh] flex flex-col overflow-hidden;
}
.dialog-enter-active, .dialog-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-enter-from, .dialog-leave-to {
  opacity: 0;
}
</style>
