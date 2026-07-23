<!-- ============================================
  MatchDetailDialog.vue — 缺色匹配详情弹窗
  展示匹配度 + 三分类列表 + 替代色 + 操作按钮
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
          class="bg-white rounded-2xl shadow-xl w-[480px] max-w-[94vw] max-h-[85vh] flex flex-col overflow-hidden animate-bounce-in"
        >
          <!-- 头部 -->
          <div class="flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
            <div>
              <h3 class="font-bold text-slate-800 text-base">📦 缺色匹配</h3>
              <p class="text-[11px] text-slate-400 truncate max-w-[300px]">{{ designTitle }}</p>
            </div>
            <button
              class="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
              @click="$emit('close')"
            >
              <XIcon :size="16" class="text-slate-400" />
            </button>
          </div>

          <!-- 匹配度概览 -->
          <div class="px-5 pb-3 flex-shrink-0">
            <div class="flex items-center gap-3">
              <!-- 匹配度圆环 -->
              <div class="relative w-16 h-16 flex-shrink-0">
                <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" stroke-width="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    :stroke="matchColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    :stroke-dasharray="Math.PI * 31"
                    :stroke-dashoffset="Math.PI * 31 * (1 - matchData.matchRate / 100)"
                  />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-sm font-bold" :class="matchTextColor"
                    >{{ matchData.matchRate }}%</span
                  >
                </div>
              </div>

              <!-- 分类标签 -->
              <div class="flex flex-wrap gap-1.5">
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-600"
                >
                  🟢 充足 {{ matchData.sufficient?.length || 0 }}色
                </span>
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600"
                >
                  🟡 不足 {{ matchData.insufficient?.length || 0 }}色
                </span>
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-500"
                >
                  🔴 缺失 {{ matchData.missing?.length || 0 }}色
                </span>
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-500"
                >
                  可做 {{ matchData.maxCopies || 0 }} 份
                </span>
              </div>
            </div>
          </div>

          <!-- 颜色列表 -->
          <div class="flex-1 overflow-y-auto px-5 pb-3">
            <!-- 缺失 -->
            <template v-if="matchData.missing?.length">
              <div class="text-[11px] font-semibold text-red-500 mb-2 mt-2">🔴 完全缺失</div>
              <div
                v-for="item in matchData.missing"
                :key="item.hex"
                class="flex items-center gap-2 py-1.5 border-l-2 border-red-400 pl-2 mb-1 bg-red-50/30 rounded-r-lg"
              >
                <div
                  class="w-4 h-4 rounded-sm ring-1 ring-black/10 flex-shrink-0"
                  :style="{ background: item.hex }"
                />
                <span class="text-[11px] text-slate-600 flex-1 truncate">{{
                  item.name || item.hex
                }}</span>
                <span class="text-[11px] text-slate-400 font-mono">需{{ item.need }}</span>
                <span class="text-[11px] text-red-500 font-mono font-bold"
                  >缺{{ item.shortage }}</span
                >
                <button
                  v-if="matchData.suggestions?.[item.hex]?.length"
                  class="text-[10px] text-primary hover:underline flex-shrink-0"
                  @click.stop="toggleSub(item.hex)"
                >
                  替代色
                </button>
              </div>
            </template>

            <!-- 不足 -->
            <template v-if="matchData.insufficient?.length">
              <div class="text-[11px] font-semibold text-amber-600 mb-2 mt-3">🟡 库存不足</div>
              <div
                v-for="item in matchData.insufficient"
                :key="item.hex"
                class="flex items-center gap-2 py-1.5 border-l-2 border-amber-400 pl-2 mb-1 bg-amber-50/30 rounded-r-lg"
              >
                <div
                  class="w-4 h-4 rounded-sm ring-1 ring-black/10 flex-shrink-0"
                  :style="{ background: item.hex }"
                />
                <span class="text-[11px] text-slate-600 flex-1 truncate">{{ item.name }}</span>
                <span class="text-[11px] text-slate-400 font-mono">需{{ item.need }}</span>
                <span class="text-[11px] text-slate-400 font-mono">存{{ item.stock }}</span>
                <span class="text-[11px] text-amber-600 font-mono font-bold"
                  >缺{{ item.shortage }}</span
                >
                <button
                  v-if="matchData.suggestions?.[item.hex]?.length"
                  class="text-[10px] text-primary hover:underline flex-shrink-0"
                  @click.stop="toggleSub(item.hex)"
                >
                  替代色
                </button>
              </div>
            </template>

            <!-- 充足 -->
            <template v-if="matchData.sufficient?.length">
              <div class="text-[11px] font-semibold text-green-600 mb-2 mt-3">🟢 库存充足</div>
              <div
                v-for="item in matchData.sufficient"
                :key="item.hex"
                class="flex items-center gap-2 py-1.5 border-l-2 border-green-300 pl-2 mb-1 bg-green-50/20 rounded-r-lg"
              >
                <div
                  class="w-4 h-4 rounded-sm ring-1 ring-black/10 flex-shrink-0"
                  :style="{ background: item.hex }"
                />
                <span class="text-[11px] text-slate-500 flex-1 truncate">{{ item.name }}</span>
                <span class="text-[11px] text-slate-400 font-mono">需{{ item.need }}</span>
                <span class="text-[11px] text-green-600 font-mono">存{{ item.stock }}</span>
              </div>
            </template>

            <!-- 替代色展开区域 -->
            <div
              v-if="activeSubHex && matchData.suggestions?.[activeSubHex]?.length"
              class="bg-blue-50/30 rounded-lg p-2.5 mb-2"
            >
              <div class="text-[10px] font-semibold text-slate-600 mb-1.5">
                {{ activeSubHex }} 的替代色推荐
              </div>
              <div class="space-y-1">
                <div
                  v-for="alt in matchData.suggestions[activeSubHex]"
                  :key="alt.colorId"
                  class="flex items-center gap-2 text-[10px]"
                >
                  <div
                    class="w-4 h-4 rounded-sm ring-1 ring-black/10 flex-shrink-0"
                    :style="{ background: alt.hex }"
                  />
                  <span class="text-slate-600 flex-1">{{ alt.name }}</span>
                  <span
                    class="font-mono"
                    :class="
                      alt.grade === 'excellent'
                        ? 'text-green-500'
                        : alt.grade === 'good'
                          ? 'text-amber-500'
                          : 'text-slate-400'
                    "
                  >
                    ΔE{{ alt.deltaE }}
                  </span>
                  <span class="text-green-600 font-mono">{{ alt.inStock }}颗</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部操作 -->
          <div class="flex border-t border-slate-100 flex-shrink-0">
            <button
              class="flex-1 h-10 text-xs text-primary font-medium hover:bg-primary/5 transition-colors"
              @click="addAllToPurchase"
            >
              📋 全选加入采购清单
            </button>
            <div class="w-px bg-slate-100" />
            <button
              class="flex-1 h-10 text-xs text-slate-500 font-medium hover:bg-slate-50 transition-colors"
              @click="$emit('close')"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { X as XIcon } from 'lucide-vue-next'
import API from '@/api/index.js'
import { useToast } from '@/composables/useToast.js'

const props = defineProps({
  matchData: { type: Object, default: null },
  designTitle: { type: String, default: '' },
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'deduct'])
const toast = useToast()

const activeSubHex = ref('')

function toggleSub(hex) {
  activeSubHex.value = activeSubHex.value === hex ? '' : hex
}

const matchColor = computed(() => {
  const rate = props.matchData?.matchRate || 0
  if (rate >= 80) return '#22c55e'
  if (rate >= 50) return '#f59e0b'
  return '#ef4444'
})

const matchTextColor = computed(() => {
  const rate = props.matchData?.matchRate || 0
  if (rate >= 80) return 'text-green-600'
  if (rate >= 50) return 'text-amber-600'
  return 'text-red-500'
})

async function addAllToPurchase() {
  const allShortages = [
    ...(props.matchData?.missing || []),
    ...(props.matchData?.insufficient || []),
  ]
  if (!allShortages.length) {
    toast.show('没有需要补货的颜色')
    return
  }
  try {
    const res = await API.post(
      '/api/inventory/purchase-list',
      {
        title: `${props.designTitle || '图纸'} 补货清单`,
      },
      true
    )
    toast.show(res.message || '已生成采购清单')
  } catch (e) {
    toast.show('操作失败')
  }
}
</script>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
</style>
