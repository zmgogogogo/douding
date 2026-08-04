<!-- ============================================
  ColorDetailDialog.vue — 色号详情弹窗
  展示大色块 + 库存信息 + 替代色推荐 + 出入库时间轴
  ============================================ -->
<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="visible"
        class="fixed inset-0 z-[160] flex items-center justify-center bg-black/30 backdrop-blur-sm"
        @click.self="$emit('close')"
      >
        <div
          class="bg-white rounded-2xl shadow-xl w-[420px] max-w-[92vw] max-h-[85vh] flex flex-col overflow-hidden animate-bounce-in"
        >
          <!-- 头部 -->
          <div class="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
            <h3 class="font-bold text-slate-800 text-base">色号详情</h3>
            <button
              class="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
              @click="$emit('close')"
            >
              <XIcon :size="16" class="text-slate-400" />
            </button>
          </div>

          <div v-if="loading" class="px-5 py-10 text-center text-sm text-slate-400">加载中...</div>

          <template v-else-if="detail">
            <div class="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
              <!-- 大色块 + 基本信息 -->
              <div class="flex gap-4">
                <div
                  class="w-24 h-24 rounded-xl ring-1 ring-black/10 flex-shrink-0"
                  :style="{ background: detail.color?.hex || '#ccc' }"
                />
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-base text-slate-800">{{ detail.color?.name }}</div>
                  <div class="text-xs text-slate-500 mt-0.5">
                    {{ detail.color?.brand }} · {{ detail.color?.series }}
                  </div>
                  <div class="text-xs text-slate-400 font-mono mt-0.5">{{ detail.color?.hex }}</div>
                  <div v-if="detail.color?.lab_l" class="text-[10px] text-slate-400 mt-0.5">
                    LAB {{ detail.color.lab_l?.toFixed(1) }}, {{ detail.color.lab_a?.toFixed(1) }},
                    {{ detail.color.lab_b?.toFixed(1) }}
                  </div>
                </div>
              </div>

              <!-- 库存信息 -->
              <div class="bg-slate-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div
                    class="text-lg font-bold"
                    :class="invQty === 0 ? 'text-red-500' : 'text-slate-800'"
                  >
                    {{ (invQty || 0).toLocaleString() }}
                  </div>
                  <div class="text-[10px] text-slate-400">当前库存</div>
                </div>
                <div>
                  <div class="text-lg font-bold text-amber-500">
                    {{ (detail.inventory?.transitQuantity || 0).toLocaleString() }}
                  </div>
                  <div class="text-[10px] text-slate-400">运输中</div>
                </div>
                <div>
                  <div class="text-lg font-bold text-slate-600">
                    {{ (detail.inventory?.minThreshold || 0).toLocaleString() }}
                  </div>
                  <div class="text-[10px] text-slate-400">预警阈值</div>
                </div>
              </div>

              <!-- 快捷调整 -->
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 flex-shrink-0">快捷：</span>
                  <button class="quick-btn" @click="quickAdjust(-100)">−100</button>
                  <button class="quick-btn" @click="quickAdjust(-10)">−10</button>
                  <button class="quick-btn" @click="quickAdjust(10)">+10</button>
                  <button class="quick-btn" @click="quickAdjust(100)">+100</button>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 flex-shrink-0">设为：</span>
                  <input
                    v-model.number="setQty"
                    type="number"
                    min="0"
                    class="w-20 h-7 px-2 rounded-lg border border-slate-200 text-xs text-center font-mono font-bold text-slate-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/10"
                  />
                  <button
                    class="h-7 px-3 rounded-lg text-[10px] font-medium bg-primary text-white hover:opacity-90 transition-colors"
                    @click="doSet"
                    :disabled="setQty === invQty"
                  >
                    确定
                  </button>
                </div>
              </div>



              <!-- 操作记录 -->
              <div v-if="detail.logs?.length">
                <div class="text-xs font-semibold text-slate-600 mb-2">📜 操作记录</div>
                <!-- 表头 -->
                <div class="flex items-center gap-2 text-[10px] text-slate-400 border-b border-slate-100 pb-1 mb-1">
                  <span class="w-[52px] flex-shrink-0">时间</span>
                  <span class="w-14 flex-shrink-0 text-center">数量</span>
                  <span class="w-14 flex-shrink-0 text-center">结余</span>
                </div>
                <div class="space-y-1 max-h-[200px] overflow-y-auto">
                  <div
                    v-for="log in displayLogs"
                    :key="log.id"
                    class="flex items-center gap-2 text-[11px]"
                  >
                    <span class="text-slate-500 w-[52px] flex-shrink-0">{{ formatDate(log.created_at) }}</span>
                    <span
                      class="font-mono font-bold w-14 flex-shrink-0 text-center"
                      :class="log.quantity > 0 ? 'text-emerald-500' : log.quantity < 0 ? 'text-red-500' : 'text-slate-400'"
                    >
                      {{ log.quantity > 0 ? '+' : '' }}{{ log.quantity }}
                    </span>
                    <span class="font-mono text-slate-700 w-14 flex-shrink-0 text-center">{{ log.balanceAfter ?? '-' }}</span>
                  </div>
                </div>
                <button
                  v-if="detail.logs.length > 20"
                  class="text-[10px] text-primary mt-1 hover:underline"
                  @click="showAllLogs = !showAllLogs"
                >
                  {{ showAllLogs ? '收起' : `查看全部 ${detail.logs.length} 条` }}
                </button>
              </div>

              <!-- 相关图纸 -->
              <div v-if="detail.relatedDesigns?.length">
                <div class="text-xs font-semibold text-slate-600 mb-2">🎨 使用了此色的图纸</div>
                <div class="flex gap-2 overflow-x-auto">
                  <div
                    v-for="d in detail.relatedDesigns"
                    :key="d.id"
                    class="flex-shrink-0 text-center cursor-pointer"
                    @click="goToDesign(d.id)"
                  >
                    <div class="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden mx-auto">
                      <canvas v-if="d.thumbnail" class="w-full h-full" />
                      <div v-else class="w-full h-full flex items-center justify-center text-lg">
                        🧩
                      </div>
                    </div>
                    <div class="text-[9px] text-slate-600 mt-0.5 truncate w-12">{{ d.title }}</div>
                    <div class="text-[9px] text-slate-400">{{ d.usedCount }}颗</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 底部操作 -->
            <div class="flex border-t border-slate-100 flex-shrink-0">
              <button
                class="flex-1 h-10 text-xs text-slate-500 font-medium hover:bg-slate-50 transition-colors"
                @click="addToPurchaseList"
              >
                📋 加入采购清单
              </button>
              <div class="w-px bg-slate-100" />
              <button
                class="flex-1 h-10 text-xs text-red-400 font-medium hover:bg-red-50 transition-colors"
                @click="confirmDelete"
              >
                🗑 删除
              </button>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { X as XIcon } from 'lucide-vue-next'
import API from '@/api/index.js'
import { useToast } from '@/composables/useToast.js'
import { useDialog } from '@/composables/useDialog.js'

const props = defineProps({
  colorId: { type: Number, default: null },
  visible: { type: Boolean, default: false },
  inventoryItem: { type: Object, default: null },
})

const emit = defineEmits(['close', 'updated', 'select-substitute'])

const router = useRouter()
const toast = useToast()
const dialog = useDialog()

const loading = ref(false)
const detail = ref(null)
const setQty = ref(0)
const adjustQty = ref(0)
const showAllLogs = ref(false)

const invQty = computed(
  () => detail.value?.inventory?.quantity ?? props.inventoryItem?.quantity ?? 0
)
const displayLogs = computed(() => {
  const logs = detail.value?.logs || []
  return showAllLogs.value ? logs : logs.slice(0, 20)
})

watch(
  () => [props.colorId, props.visible],
  async ([id, vis]) => {
    if (!id || !vis) return
    loading.value = true
    adjustQty.value = props.inventoryItem?.quantity || 0
    setQty.value = props.inventoryItem?.quantity || 0
    try {
      const detailRes = await API.get(`/api/inventory/color-detail/${id}`, true)
      detail.value = detailRes.data
    } catch (e) {
      toast.show('加载色号详情失败')
    } finally {
      loading.value = false
    }
  }
)

function formatDate(d) {
  if (!d) return ''
  const dt = new Date(d + (d.includes('T') ? '' : 'T00:00:00'))
  if (isNaN(dt.getTime())) return d.slice(0, 16)
  const mm = dt.getMonth() + 1, dd = dt.getDate()
  const hh = dt.getHours().toString().padStart(2, '0')
  const min = dt.getMinutes().toString().padStart(2, '0')
  return `${mm}/${dd} ${hh}:${min}`
}

async function quickAdjust(delta) {
  setQty.value = Math.max(0, setQty.value + delta)
}

async function doSet() {
  try {
    await API.put(`/api/inventory/${props.colorId}`, { quantity: setQty.value }, true)
    toast.show('库存已更新')
    emit('updated')
    emit('close')
  } catch (e) {
    toast.show('调整失败')
  }
}

async function confirmDelete() {
  const ok = await dialog.confirm('确定要删除此颜色的库存记录吗？')
  if (!ok) return
  try {
    await API.put(`/api/inventory/${props.colorId}`, { quantity: 0 }, true)
    toast.show('已删除')
    emit('updated')
    emit('close')
  } catch (e) {
    toast.show('删除失败')
  }
}

async function addToPurchaseList() {
  try {
    const res = await API.post(
      '/api/inventory/purchase-list',
      {
        title: `${detail.value?.color?.name || '未知'} 补货`,
        designIds: [],
      },
      true
    )
    toast.show(res.message || '已加入采购清单')
  } catch (e) {
    toast.show('操作失败')
  }
}

function goToDesign(id) {
  router.push(`/detail/${id}`)
  emit('close')
}
</script>

<style scoped>
.quick-btn {
  @apply h-7 px-2 rounded-lg text-[10px] font-medium border border-slate-200 text-slate-500
         hover:bg-slate-50 transition-colors flex-shrink-0;
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
