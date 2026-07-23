<!-- ============================================
  EditorPaletteAdvisor.vue — AI 智能配色助手面板
  调色板推荐 + 和谐度分析 + 色弱检查
  ============================================ -->
<template>
  <div class="border-t border-[var(--ui-border)] bg-[var(--ui-bg-base)]">
    <!-- 标题栏 -->
    <button
      class="w-full flex items-center justify-between px-3 py-1.5 text-[10px] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-tertiary)] transition-colors"
      @click="expanded = !expanded"
    >
      <span>🎨 AI 配色助手</span>
      <ChevronRightIcon :size="12" :class="expanded && 'rotate-90'" class="transition-transform" />
    </button>

    <div v-if="expanded" class="px-2 pb-2 space-y-2 max-h-[320px] overflow-y-auto">
      <!-- 当前配色颜色列表 -->
      <div v-if="currentColors.length" class="space-y-1">
        <div class="text-[9px] text-[var(--ui-text-tertiary)] font-medium px-1">
          当前配色 ({{ currentColors.length }}色)
        </div>
        <div class="flex flex-wrap gap-1">
          <div
            v-for="(c, i) in currentColors"
            :key="i"
            class="w-5 h-5 rounded ring-1 ring-black/10 flex-shrink-0"
            :style="{ background: c }"
            :title="c"
          />
        </div>
      </div>

      <!-- 操作按钮组 -->
      <div class="grid grid-cols-2 gap-1">
        <button class="advisor-btn" @click="getRecommendations" :disabled="loading">
          <SparklesIcon :size="12" />推荐配色
        </button>
        <button class="advisor-btn" @click="checkHarmony" :disabled="loading">
          <CheckCircleIcon :size="12" />和谐度
        </button>
        <button class="advisor-btn" @click="checkColorblind" :disabled="loading">
          <EyeIcon :size="12" />色弱检查
        </button>
        <button class="advisor-btn" @click="getFillPreview('gradient')" :disabled="loading">
          <Wand2Icon :size="12" />填充预览
        </button>
      </div>

      <!-- 推荐结果 -->
      <div v-if="recommendations.length" class="space-y-1">
        <div class="text-[9px] text-emerald-600 font-medium px-1 flex items-center gap-1">
          <SparklesIcon :size="10" />{{ schemeLabel }}
        </div>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="c in recommendations"
            :key="c.hex"
            class="w-6 h-6 rounded-lg ring-1 ring-black/10 hover:scale-125 hover:z-10 hover:shadow-md transition-all"
            :style="{ background: c.hex }"
            :title="`${c.name} ${c.hex}`"
            @click="$emit('selectColor', c)"
          />
        </div>
      </div>

      <!-- 和谐度结果 -->
      <div v-if="harmonyResult" class="space-y-1 text-[10px]">
        <div class="flex items-center gap-1 px-1">
          <span class="font-bold" :class="harmonyColor">{{ harmonyResult.grade }}级</span>
          <span class="text-[var(--ui-text-tertiary)]">· {{ harmonyResult.score }}分</span>
        </div>
        <div v-if="harmonyResult.issues.length" class="space-y-0.5">
          <div
            v-for="(issue, i) in harmonyResult.issues"
            :key="i"
            class="text-[9px] text-amber-600 bg-amber-50 rounded-md px-1.5 py-0.5"
          >
            {{ issue }}
          </div>
        </div>
        <div v-if="harmonyResult.suggestions.length" class="space-y-0.5">
          <div
            v-for="(s, i) in harmonyResult.suggestions"
            :key="i"
            class="text-[9px] text-blue-600 bg-blue-50 rounded-md px-1.5 py-0.5"
          >
            {{ s }}
          </div>
        </div>
      </div>

      <!-- 色弱检查结果 -->
      <div v-if="colorblindResult" class="text-[10px] space-y-1">
        <div
          class="px-1 font-medium"
          :class="colorblindResult.isAccessible ? 'text-emerald-600' : 'text-amber-600'"
        >
          {{ colorblindResult.summary }}
        </div>
        <div
          v-for="(v, k) in colorblindResult.types"
          :key="k"
          class="text-[9px] text-[var(--ui-text-secondary)] px-1"
        >
          {{ v.label }}: {{ v.isAccessible ? '✅' : '⚠️' }}
          <span v-if="v.problemPairs.length" class="text-red-400"
            >{{ v.problemPairs.length }}对</span
          >
        </div>
      </div>

      <!-- 填充预览颜色选择 -->
      <div v-if="showFillOptions" class="space-y-1">
        <div class="text-[9px] text-[var(--ui-text-tertiary)] px-1">选择填充颜色</div>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="c in currentColorObjs"
            :key="c.hex"
            class="w-5 h-5 rounded ring-1 ring-black/10"
            :class="fillSelected.includes(c.hex) && 'ring-2 ring-primary'"
            :style="{ background: c.hex }"
            @click="toggleFillColor(c.hex)"
          />
        </div>
        <div class="flex gap-1 px-1">
          <button class="text-[9px] text-primary hover:underline" @click="applyFill('gradient')">
            渐变
          </button>
          <button class="text-[9px] text-primary hover:underline" @click="applyFill('pattern')">
            棋盘
          </button>
          <button class="text-[9px] text-primary hover:underline" @click="applyFill('random')">
            随机
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  ChevronRightIcon,
  SparklesIcon,
  CheckCircleIcon,
  EyeIcon,
  Wand2Icon,
} from 'lucide-vue-next'
import API from '@/api/index.js'

const props = defineProps({
  gridColorStats: { type: Array, default: () => [] },
  filteredColors: { type: Array, default: () => [] },
  gridW: { type: Number, default: 58 },
  gridH: { type: Number, default: 58 },
})

const emit = defineEmits(['selectColor', 'applyFill'])

const expanded = ref(false)
const loading = ref(false)
const recommendations = ref([])
const schemeLabel = ref('')
const harmonyResult = ref(null)
const colorblindResult = ref(null)
const showFillOptions = ref(false)
const fillSelected = ref([])

const currentColors = computed(() => props.gridColorStats.map((s) => s.hex).slice(0, 20))

const currentColorObjs = computed(() =>
  props.gridColorStats.slice(0, 10).map((s) => ({ name: s.name, hex: s.hex }))
)

const harmonyColor = computed(() => {
  if (!harmonyResult.value) return ''
  const g = harmonyResult.value.grade
  if (g === 'A') return 'text-emerald-600'
  if (g === 'B') return 'text-blue-600'
  if (g === 'C') return 'text-amber-600'
  return 'text-red-500'
})

async function getRecommendations() {
  loading.value = true
  try {
    const res = await API.post(
      '/api/palette/recommend',
      {
        existingHexes: currentColors.value,
        scheme: 'auto',
      },
      false
    )
    if (res.code === 200) {
      recommendations.value = res.data.colors || []
      schemeLabel.value = res.data.schemeLabel || ''
    }
  } catch (_) {
    /* offline */
  }
  loading.value = false
}

async function checkHarmony() {
  loading.value = true
  try {
    const res = await API.post(
      '/api/palette/harmony',
      {
        hexColors: currentColors.value,
      },
      false
    )
    if (res.code === 200) {
      harmonyResult.value = res.data
      colorblindResult.value = null
    }
  } catch (_) {
    /* offline */
  }
  loading.value = false
}

async function checkColorblind() {
  loading.value = true
  try {
    const res = await API.post(
      '/api/palette/colorblind',
      {
        hexColors: currentColors.value,
      },
      false
    )
    if (res.code === 200) {
      colorblindResult.value = res.data
      harmonyResult.value = null
    }
  } catch (_) {
    /* offline */
  }
  loading.value = false
}

function getFillPreview() {
  showFillOptions.value = !showFillOptions.value
  fillSelected.value = currentColors.value.slice(0, 3)
  harmonyResult.value = null
  colorblindResult.value = null
}

function toggleFillColor(hex) {
  const idx = fillSelected.value.indexOf(hex)
  if (idx >= 0) fillSelected.value.splice(idx, 1)
  else fillSelected.value.push(hex)
}

async function applyFill(type) {
  if (!fillSelected.value.length) return
  try {
    const res = await API.post(
      '/api/palette/fill',
      {
        type,
        colors: fillSelected.value,
        w: props.gridW,
        h: props.gridH,
        direction: 'v',
      },
      false
    )
    if (res.code === 200) {
      emit('applyFill', res.data.grid)
      showFillOptions.value = false
    }
  } catch (_) {
    /* offline */
  }
}
</script>

<style scoped>
.advisor-btn {
  @apply flex items-center justify-center gap-1 px-1.5 py-1 rounded-md text-[9px] font-medium
         bg-white border border-[var(--ui-border)] text-[var(--ui-text-secondary)]
         hover:bg-[var(--ui-bg-tertiary)] hover:text-[var(--ui-text-primary)]
         transition-colors disabled:opacity-50;
}
</style>
