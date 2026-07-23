<!-- ============================================
  WarehouseMatchBar.vue — 图纸详情页底部豆仓匹配栏
  固定在 DetailView 底部，显示库存匹配状态
  ============================================ -->
<template>
  <div v-if="isLoggedIn" class="border-t border-slate-100 bg-white/80 backdrop-blur-sm px-5 py-3">
    <!-- 加载中 -->
    <div v-if="loading" class="flex items-center gap-2 text-xs text-slate-400">
      <div class="w-3 h-3 rounded-full border-2 border-slate-300 border-t-primary animate-spin" />
      正在匹配库存...
    </div>

    <!-- 匹配结果 -->
    <div
      v-else-if="matchData"
      class="cursor-pointer hover:bg-slate-50 -mx-5 -my-3 px-5 py-3 rounded-lg transition-colors"
      @click="showMatchDialog = true"
    >
      <div class="flex items-center gap-3">
        <!-- 匹配度进度条 -->
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <div class="w-14 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="matchColor"
              :style="{ width: matchData.matchRate + '%' }"
            />
          </div>
          <span class="text-xs font-bold" :class="matchTextColor">{{ matchData.matchRate }}%</span>
        </div>

        <!-- 分类统计 -->
        <div class="flex items-center gap-2 text-[11px]">
          <span class="text-green-600 font-medium"
            >🟢 {{ matchData.sufficient?.length || 0 }}色充足</span
          >
          <span v-if="matchData.insufficient?.length" class="text-amber-600 font-medium">
            🟡 {{ matchData.insufficient.length }}色不足
          </span>
          <span v-if="matchData.missing?.length" class="text-red-500 font-medium">
            🔴 {{ matchData.missing.length }}色缺失
          </span>
        </div>

        <!-- 可制作份数 -->
        <span class="text-[11px] text-slate-400 flex-shrink-0">
          可制作 <b class="text-slate-700">{{ matchData.maxCopies || 0 }}</b> 份
        </span>

        <ChevronRightIcon :size="14" class="text-slate-300" />
      </div>
      <!-- 操作按钮 -->
      <div class="flex gap-2 mt-2" @click.stop>
        <button
          class="text-[10px] px-3 py-1 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
          @click="showDeductDialog = true"
        >
          ✅ 标记已制作
        </button>
      </div>
    </div>

    <!-- 未匹配（无数据/空豆仓） -->
    <div v-else class="text-xs text-slate-400">暂无可用的库存匹配数据</div>

    <!-- 缺色匹配详情弹窗 -->
    <MatchDetailDialog
      v-if="matchData"
      :visible="showMatchDialog"
      :match-data="matchData"
      :design-title="designTitle"
      @close="showMatchDialog = false"
      @deduct="onDeduct"
    />

    <!-- 制作扣减弹窗 -->
    <Teleport to="body">
      <Transition name="dialog">
        <div
          v-if="showDeductDialog"
          class="fixed inset-0 z-[170] flex items-center justify-center bg-black/30 backdrop-blur-sm"
          @click.self="showDeductDialog = false"
        >
          <div
            class="bg-white rounded-2xl shadow-xl p-5 w-[380px] max-w-[90vw] space-y-4 animate-bounce-in"
          >
            <h3 class="font-bold text-slate-800">标记已制作 · 扣减库存</h3>
            <p class="text-xs text-slate-500">{{ designTitle }}</p>

            <div class="space-y-3">
              <!-- 制作份数 -->
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-600">制作份数</span>
                <div class="flex items-center gap-1">
                  <button
                    class="w-6 h-6 rounded bg-slate-100 text-xs"
                    @click="deductCopies = Math.max(1, deductCopies - 1)"
                  >
                    −
                  </button>
                  <span class="w-8 text-center font-mono font-bold text-sm">{{
                    deductCopies
                  }}</span>
                  <button class="w-6 h-6 rounded bg-slate-100 text-xs" @click="deductCopies++">
                    +
                  </button>
                </div>
              </div>

              <!-- 损耗率 -->
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-600">损耗率</span>
                <div class="flex items-center gap-1">
                  <input
                    v-model.number="deductLossRate"
                    type="range"
                    min="0"
                    max="20"
                    class="w-20 h-1.5 accent-[var(--ui-accent)]"
                  />
                  <span class="text-xs font-mono w-8 text-right">{{ deductLossRate }}%</span>
                </div>
              </div>

              <!-- 预览 -->
              <div class="bg-slate-50 rounded-lg p-2.5 text-[10px] text-slate-500">
                预计消耗 <b class="text-slate-700">{{ estimatedTotal }}</b> 颗 （单份
                {{ matchData?.totalBeads || 0 }} × {{ deductCopies }}份 ×
                {{ (1 + deductLossRate / 100).toFixed(2) }}）
              </div>
            </div>

            <div class="flex gap-2">
              <button
                class="flex-1 h-9 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium"
                @click="showDeductDialog = false"
              >
                取消
              </button>
              <button
                class="flex-1 h-9 rounded-xl bg-primary text-white text-xs font-medium"
                @click="doDeduct"
                :disabled="deducting"
              >
                {{ deducting ? '扣减中...' : '确认扣减' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ChevronRight as ChevronRightIcon } from 'lucide-vue-next'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'
import MatchDetailDialog from './MatchDetailDialog.vue'

const props = defineProps({
  designId: { type: Number, required: true },
  designTitle: { type: String, default: '' },
})

const auth = useAuth()
const toast = useToast()
const isLoggedIn = computed(() => auth.isLoggedIn.value)

const loading = ref(false)
const matchData = ref(null)
const showMatchDialog = ref(false)

// 扣减弹窗
const showDeductDialog = ref(false)
const deductCopies = ref(1)
const deductLossRate = ref(5)
const deducting = ref(false)
const estimatedTotal = computed(() => {
  const base = matchData.value?.totalBeads || 0
  return Math.ceil(base * deductCopies.value * (1 + deductLossRate.value / 100))
})

const matchColor = computed(() => {
  const rate = matchData.value?.matchRate || 0
  if (rate >= 80) return 'bg-green-500'
  if (rate >= 50) return 'bg-amber-500'
  return 'bg-red-500'
})

const matchTextColor = computed(() => {
  const rate = matchData.value?.matchRate || 0
  if (rate >= 80) return 'text-green-600'
  if (rate >= 50) return 'text-amber-600'
  return 'text-red-500'
})

async function loadMatch() {
  if (!props.designId || !isLoggedIn.value) return
  loading.value = true
  try {
    const res = await API.post('/api/inventory/match', { designId: props.designId }, true)
    if (res.code === 200) matchData.value = res.data
  } catch (_) {
    matchData.value = null
  } finally {
    loading.value = false
  }
}

async function doDeduct() {
  if (!matchData.value) return
  deducting.value = true
  try {
    // 汇总所有颜色用量
    const beads = [
      ...(matchData.value.sufficient || []).map((c) => ({
        colorId: c.colorId,
        quantity: c.need,
        name: c.name,
      })),
      ...(matchData.value.insufficient || []).map((c) => ({
        colorId: c.colorId,
        quantity: c.need,
        name: c.name,
      })),
      ...(matchData.value.missing || []).map((c) => ({
        colorId: c.colorId,
        quantity: c.need,
        name: c.name || '',
      })),
    ].filter((b) => b.colorId)

    const res = await API.post(
      '/api/inventory/deduct',
      {
        designId: props.designId,
        designTitle: props.designTitle,
        beads,
        copies: deductCopies.value,
        lossRate: deductLossRate.value,
      },
      true
    )

    if (res.code === 200) {
      toast.show(`消耗扣除完成！`)
      showDeductDialog.value = false
      deductCopies.value = 1
      deductLossRate.value = 5
      await loadMatch()
    } else {
      toast.show(res.message || '扣减失败')
    }
  } catch (e) {
    toast.show('扣减失败: ' + (e.message || '网络错误'))
  } finally {
    deducting.value = false
  }
}

function onDeduct() {
  loadMatch()
}

watch(() => props.designId, loadMatch)
onMounted(loadMatch)

defineExpose({ refresh: loadMatch })
</script>
