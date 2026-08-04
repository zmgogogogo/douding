<!-- ============================================
  StockLogDialog.vue — 库存流水记录弹窗（V3.0）
  分页时间轴展示，每页50条
  表格展示：操作时间 / 操作数量 / 操作后数量 / 颜色
  ============================================ -->
<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
        <div class="dialog-panel">
          <!-- 头部 -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-slate-800">📜 库存流水</h3>
            <button class="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center" @click="$emit('close')">
              <XIcon :size="16" class="text-slate-400" />
            </button>
          </div>

          <!-- 加载中 -->
          <div v-if="loading" class="text-center py-10 text-sm text-slate-400">加载中…</div>

          <!-- 流水列表 -->
          <template v-else-if="items.length">
            <div class="max-h-[55vh] overflow-y-auto mb-4">
              <!-- 表头 -->
              <div class="flex items-center gap-2 px-2 pb-2 text-[10px] text-slate-400 border-b border-slate-100 mb-1">
                <span class="w-[52px] flex-shrink-0">时间</span>
                <span class="w-14 flex-shrink-0 text-center">数量</span>
                <span class="w-12 flex-shrink-0 text-center">结余</span>
                <span class="flex-1 text-right">颜色</span>
              </div>
              <div
                v-for="log in items"
                :key="log.id"
                class="flex items-center gap-2 px-2 py-2 border-b border-slate-50 last:border-0"
              >
                <span class="text-[11px] text-slate-500 w-[52px] flex-shrink-0">{{ formatTime(log.createTime) }}</span>
                <span
                  class="text-[11px] font-mono font-bold w-14 flex-shrink-0 text-center"
                  :class="(log.num || 0) > 0 ? 'text-emerald-500' : (log.num || 0) < 0 ? 'text-red-500' : 'text-slate-400'"
                >
                  {{ (log.num || 0) > 0 ? '+' : '' }}{{ log.num }}
                </span>
                <span class="text-[11px] font-mono text-slate-700 w-12 flex-shrink-0 text-center">{{ log.afterStock ?? '-' }}</span>
                <span class="text-[11px] text-slate-600 flex-1 text-right truncate">{{ log.colorName }}</span>
              </div>
            </div>

            <!-- 分页 -->
            <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mb-3">
              <button
                class="px-3 h-7 rounded-lg text-xs border border-slate-200 text-slate-500 disabled:opacity-30"
                :disabled="page <= 1"
                @click="loadLogs(page - 1)"
              >上一页</button>
              <span class="text-xs text-slate-400">{{ page }} / {{ totalPages }}</span>
              <button
                class="px-3 h-7 rounded-lg text-xs border border-slate-200 text-slate-500 disabled:opacity-30"
                :disabled="page >= totalPages"
                @click="loadLogs(page + 1)"
              >下一页</button>
            </div>
          </template>

          <!-- 空状态 -->
          <div v-else class="text-center py-10">
            <div class="text-5xl mb-3">📜</div>
            <p class="text-sm font-medium text-slate-500">暂无流水记录</p>
            <p class="text-xs text-slate-400 mt-1">库存变动后将在此显示</p>
          </div>

          <button
            class="w-full h-10 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium mt-2"
            @click="$emit('close')"
          >关闭</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { X as XIcon } from 'lucide-vue-next'
import API from '@/api/index.js'
import { useToast } from '@/composables/useToast.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
})

defineEmits(['close'])

const toast = useToast()

const items = ref([])
const loading = ref(false)
const page = ref(1)
const totalPages = ref(1)

watch(() => props.visible, async (vis) => {
  if (!vis) return
  page.value = 1
  await loadLogs(1)
})

async function loadLogs(p) {
  loading.value = true
  try {
    const res = await API.get(`/api/stock/log/list?page=${p}&limit=50`, true)
    if (res.code === 200) {
      items.value = res.data?.items || []
      page.value = res.data?.page || p
      totalPages.value = res.data?.totalPages || 1
    }
  } catch (e) {
    toast.show('加载流水记录失败')
  } finally {
    loading.value = false
  }
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t + (t.includes('T') ? '' : 'T00:00:00'))
  if (isNaN(d.getTime())) return t.slice(0, 16)
  const mm = d.getMonth() + 1, dd = d.getDate()
  const hh = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${mm}/${dd} ${hh}:${min}`
}
</script>

<style scoped>
.dialog-overlay {
  @apply fixed inset-0 z-[150] flex items-center justify-center bg-black/30 backdrop-blur-sm;
}
.dialog-panel {
  @apply bg-white rounded-2xl shadow-xl p-5 w-[400px] max-w-[92vw] max-h-[85vh] overflow-y-auto;
}
.dialog-enter-active, .dialog-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-enter-from, .dialog-leave-to {
  opacity: 0;
}
</style>
