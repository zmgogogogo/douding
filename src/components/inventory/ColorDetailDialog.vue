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
              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-500 flex-shrink-0">快捷调整：</span>
                <button class="quick-btn" @click="quickAdjust(-100)">−100</button>
                <button class="quick-btn" @click="quickAdjust(-10)">−10</button>
                <span class="text-xs font-mono font-bold text-slate-700 w-14 text-center">{{
                  adjustQty
                }}</span>
                <button class="quick-btn" @click="quickAdjust(10)">+10</button>
                <button class="quick-btn" @click="quickAdjust(100)">+100</button>
                <button
                  class="h-7 px-2 rounded-lg text-[10px] font-medium bg-primary text-white hover:bg-primary-dark transition-colors"
                  @click="doAdjust"
                  :disabled="adjustQty === (detail.inventory?.quantity || 0)"
                >
                  确定
                </button>
              </div>

              <!-- 替代色推荐 -->
              <div v-if="detail.alternatives?.length">
                <div class="text-xs font-semibold text-slate-600 mb-2">📋 豆仓内近似色</div>
                <div class="flex gap-2 overflow-x-auto pb-1">
                  <div
                    v-for="alt in detail.alternatives"
                    :key="alt.colorId"
                    class="flex-shrink-0 w-[72px] bg-slate-50 rounded-lg p-1.5 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                    @click="$emit('select-substitute', alt)"
                  >
                    <div
                      class="w-8 h-8 rounded-md ring-1 ring-black/10 mx-auto mb-1"
                      :style="{ background: alt.hex }"
                    />
                    <div class="text-[9px] text-slate-600 truncate">{{ alt.name }}</div>
                    <div
                      class="text-[9px] font-mono"
                      :class="
                        alt.grade === 'excellent'
                          ? 'text-green-500'
                          : alt.grade === 'good'
                            ? 'text-amber-500'
                            : 'text-slate-400'
                      "
                    >
                      ΔE{{ alt.deltaE }}
                    </div>
                    <div class="text-[9px] text-slate-400">{{ alt.inStock || 0 }}颗</div>
                  </div>
                </div>
              </div>

              <!-- 出入库记录 -->
              <div v-if="detail.logs?.length">
                <div class="text-xs font-semibold text-slate-600 mb-2">📜 操作记录</div>
                <div class="space-y-1.5 max-h-[200px] overflow-y-auto">
                  <div
                    v-for="log in displayLogs"
                    :key="log.id"
                    class="flex items-center gap-2 text-[10px]"
                  >
                    <div
                      class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      :class="log.action === 'inbound' ? 'bg-green-400' : 'bg-red-400'"
                    />
                    <span class="text-slate-400 w-14 flex-shrink-0">{{
                      formatDate(log.created_at)
                    }}</span>
                    <span
                      :class="log.quantity > 0 ? 'text-green-600' : 'text-red-500'"
                      class="font-mono"
                    >
                      {{ log.quantity > 0 ? '+' : '' }}{{ log.quantity }}
                    </span>
                    <span class="text-slate-500 truncate flex-1">{{
                      log.source_name || log.note || log.source_type || ''
                    }}</span>
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
    try {
      const [detailRes, altRes] = await Promise.all([
        API.get(`/api/inventory/color-detail/${id}`, true),
        API.get(`/api/inventory/substitute/${id}?warehouseOnly=true`, true),
      ])
      detail.value = {
        ...detailRes.data,
        alternatives: altRes.data?.substitutes || [],
      }
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
  if (isNaN(dt.getTime())) return d.slice(0, 10)
  return `${dt.getMonth() + 1}/${dt.getDate()}`
}

async function quickAdjust(delta) {
  adjustQty.value = Math.max(0, adjustQty.value + delta)
}

async function doAdjust() {
  try {
    await API.put(`/api/inventory/${props.colorId}`, { quantity: adjustQty.value }, true)
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
