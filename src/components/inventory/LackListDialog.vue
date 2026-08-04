<!-- ============================================
  LackListDialog.vue — 缺料清单弹窗（V3.0）
  统计范围：缺货 + 库存紧张颜色
  建议补货量：缺货→100颗，紧张→warnNum - stockNum
  支持：一键复制文本清单
  ============================================ -->
<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
        <div class="dialog-panel">
          <!-- 头部 -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-slate-800">📋 缺料清单</h3>
            <button class="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center" @click="$emit('close')">
              <XIcon :size="16" class="text-slate-400" />
            </button>
          </div>

          <!-- 统计 -->
          <div v-if="loading" class="text-center py-10 text-sm text-slate-400">加载中…</div>

          <template v-else-if="items.length">
            <div class="flex gap-2 mb-3 text-xs">
              <span class="px-2 py-1 rounded-full bg-red-50 text-red-600 font-medium">
                缺货 {{ outCount }} 种
              </span>
              <span class="px-2 py-1 rounded-full bg-amber-50 text-amber-600 font-medium">
                紧张 {{ lowCount }} 种
              </span>
              <span class="px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                共需补 {{ totalShortage.toLocaleString() }} 颗
              </span>
            </div>

            <!-- 清单列表 -->
            <div class="space-y-2 max-h-[50vh] overflow-y-auto mb-4">
              <div
                v-for="item in items"
                :key="item.colorId"
                class="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100"
                :class="item.status === 'out' ? 'bg-red-50/30' : 'bg-amber-50/20'"
              >
                <div
                  class="w-10 h-10 rounded-lg flex-shrink-0 ring-1 ring-black/10"
                  :style="{ background: item.colorHex }"
                />
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-semibold text-slate-700">
                    {{ item.brand || '' }}
                    <span class="text-[10px] text-slate-500 font-mono ml-0.5">{{ getColorCode(item.colorName) }}</span>
                  </div>
                  <div class="text-[11px] text-slate-500 mt-0.5">
                    库存 {{ item.stockNum }} 颗
                    <span class="mx-1">→</span>
                    <span class="font-semibold text-primary">建议补 {{ item.suggestNum }} 颗</span>
                  </div>
                </div>
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                  :style="item.status === 'out' ? 'background:#ffe8e8;color:#f53f3f' : 'background:#fff3e8;color:#ff7d00'"
                >
                  {{ item.status === 'out' ? '缺货' : '紧张' }}
                </span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex gap-2">
              <button
                class="flex-1 h-10 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors"
                @click="copyAsText"
              >
                {{ copied ? '✅ 已复制' : '📝 复制文本清单' }}
              </button>
            </div>
          </template>

          <!-- 空状态 -->
          <div v-else class="text-center py-10">
            <div class="text-5xl mb-3">🎉</div>
            <p class="text-sm font-medium text-slate-500">库存充足，暂无缺料</p>
          </div>

          <button
            class="w-full h-10 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium mt-3"
            @click="$emit('close')"
          >关闭</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
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
const copied = ref(false)

const outCount = computed(() => items.value.filter(i => i.status === 'out').length)
const lowCount = computed(() => items.value.filter(i => i.status === 'low').length)
const totalShortage = computed(() => items.value.reduce((s, i) => s + i.suggestNum, 0))

watch(() => props.visible, async (vis) => {
  if (!vis) return
  loading.value = true
  copied.value = false
  try {
    const res = await API.get('/api/stock/lack-list', true)
    if (res.code === 200) {
      items.value = res.data?.items || []
    }
  } catch (e) {
    toast.show('加载缺料清单失败')
  } finally {
    loading.value = false
  }
})

async function copyAsText() {
  const lines = items.value.map((item, i) => {
    const code = getColorCode(item.colorName)
    return `${i + 1}. ${item.brand || ''} ${code} — 库存${item.stockNum}颗 → 建议补${item.suggestNum}颗`
  })
  const text = `📋 拼豆缺料清单\n${'─'.repeat(30)}\n${lines.join('\n')}\n${'─'.repeat(30)}\n共需补 ${totalShortage.value.toLocaleString()} 颗豆子`

  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    toast.show('已复制到剪贴板')
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    toast.show('复制失败，请手动截图')
  }
}

/** 从完整颜色名提取编号（如 "H2 White" → "H2"） */
function getColorCode(name) {
  if (!name) return '?'
  const idx = name.indexOf(' ')
  return idx > 0 ? name.slice(0, idx) : name
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
