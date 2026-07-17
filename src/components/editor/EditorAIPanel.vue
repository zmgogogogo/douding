<!--
  EditorAIPanel.vue — AI 增强面板（V3.0 14节）
  三个标签页：一键优化 / 智能生成 / 配色助手
-->
<template>
  <div class="flex-1 flex flex-col overflow-hidden text-[11px]">
    <!-- 子标签页 -->
    <div class="flex border-b border-[var(--ui-border)]">
      <button v-for="t in tabs" :key="t.id"
        class="flex-1 py-1.5 text-[9px] font-medium transition-colors"
        :class="tab === t.id ? 'text-[var(--ui-accent)] border-b-2 border-[var(--ui-accent)]' : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-secondary)]'"
        @click="tab = t.id">{{ t.label }}</button>
    </div>

    <!-- ====== 一键优化 ====== -->
    <div v-if="tab === 'optimize'" class="flex-1 overflow-y-auto p-2 space-y-2">
      <button class="optimize-btn" @click="runEnhance('simplify')" :disabled="loading">
        <span class="text-base">🧹</span>
        <div class="text-left"><div class="font-medium">一键去杂点</div><div class="text-[9px] text-[var(--ui-text-tertiary)]">连通域过滤 + 形态学开运算</div></div>
        <LoaderIcon v-if="loading && action === 'simplify'" :size="14" class="animate-spin ml-auto" />
      </button>
      <button class="optimize-btn" @click="runEnhance('edges')" :disabled="loading">
        <span class="text-base">✏️</span>
        <div class="text-left"><div class="font-medium">强化轮廓</div><div class="text-[9px] text-[var(--ui-text-tertiary)]">Canny边缘检测 + 轮廓补强</div></div>
        <LoaderIcon v-if="loading && action === 'edges'" :size="14" class="animate-spin ml-auto" />
      </button>
      <button class="optimize-btn" @click="runEnhance('tile')" :disabled="loading">
        <span class="text-base">🔄</span>
        <div class="text-left"><div class="font-medium">循环平铺</div><div class="text-[9px] text-[var(--ui-text-tertiary)]">边缘对齐 + 无缝拼接</div></div>
        <LoaderIcon v-if="loading && action === 'tile'" :size="14" class="animate-spin ml-auto" />
      </button>
      <button class="optimize-btn" @click="runEnhance('style')" :disabled="loading">
        <span class="text-base">🎮</span>
        <div class="text-left"><div class="font-medium">像素风格化</div><div class="text-[9px] text-[var(--ui-text-tertiary)]">8-bit复古风格转换</div></div>
        <span class="ml-auto text-[8px] text-[var(--ui-text-tertiary)] bg-[var(--ui-bg-tertiary)] px-1.5 py-0.5 rounded">8bit</span>
        <LoaderIcon v-if="loading && action === 'style'" :size="14" class="animate-spin" />
      </button>

      <div v-if="error" class="text-[10px] text-red-500 bg-red-50 rounded-lg p-2">{{ error }}</div>
    </div>

    <!-- ====== 智能生成 ====== -->
    <div v-if="tab === 'generate'" class="flex-1 overflow-y-auto p-2 space-y-2">
      <!-- 文生拼豆 -->
      <div class="space-y-1.5">
        <div class="text-[10px] font-medium text-[var(--ui-text-secondary)]">文生拼豆</div>
        <textarea v-model="genPrompt" rows="2" placeholder="描述你想要的图案，如：一只微笑的柴犬"
          class="w-full border border-[var(--ui-border)] rounded-lg px-2 py-1 text-[10px] resize-none bg-[var(--ui-bg-base)] outline-none focus:border-[var(--ui-accent)]" />
        <div class="flex gap-1.5">
          <select v-model="genBrand" class="border rounded px-1 py-0.5 text-[9px] flex-1">
            <option value="Hama">Hama</option><option value="Mideer">Mideer</option>
          </select>
          <select v-model="genSize" class="border rounded px-1 py-0.5 text-[9px] w-16">
            <option value="16">16×16</option><option value="32">32×32</option><option value="48">48×48</option>
          </select>
          <button class="px-3 py-0.5 rounded text-[10px] bg-[var(--ui-accent)] text-white hover:opacity-90 disabled:opacity-50"
            :disabled="!genPrompt.trim() || loading" @click="runGenerate">
            {{ loading ? '生成中...' : '生成' }}
          </button>
        </div>
      </div>

      <!-- 关键词快捷 -->
      <div class="space-y-1">
        <div class="text-[10px] text-[var(--ui-text-tertiary)]">快捷关键词</div>
        <div class="flex flex-wrap gap-1">
          <button v-for="cat in templates" :key="cat.category"
            class="text-[9px] px-1.5 py-0.5 rounded-md bg-[var(--ui-bg-tertiary)] hover:bg-[var(--ui-accent)]/10 hover:text-[var(--ui-accent)] transition-colors"
            @click="genPrompt = genPrompt + ' ' + cat.items[0]">{{ cat.category }}</button>
        </div>
        <div v-if="activeKeywords.length" class="flex flex-wrap gap-1">
          <button v-for="kw in activeKeywords" :key="kw"
            class="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--ui-accent)]/10 text-[var(--ui-accent)]"
            @click="genPrompt = genPrompt + ' ' + kw">{{ kw }}</button>
        </div>
      </div>

      <div v-if="genResult" class="text-[10px] text-emerald-600 bg-emerald-50 rounded-lg p-2">
        ✅ 生成成功！{{ genResult.beadCount ? genResult.beadCount + '颗豆子' : '' }}
      </div>

      <!-- 线稿上色（占位） -->
      <div class="space-y-1 pt-2 border-t border-[var(--ui-border)]">
        <div class="text-[10px] font-medium text-[var(--ui-text-secondary)]">线稿上色</div>
        <label class="flex items-center gap-2 px-3 py-2 border border-dashed border-[var(--ui-border)] rounded-lg text-[10px] text-[var(--ui-text-tertiary)] cursor-pointer hover:border-[var(--ui-accent)]">
          <UploadIcon :size="14" />
          <span>上传线稿图片（PNG/JPG）</span>
          <input type="file" accept="image/*" class="hidden" @change="onLineArtUpload" />
        </label>
      </div>
    </div>

    <!-- ====== 配色助手 ====== -->
    <div v-if="tab === 'palette'" class="flex-1 overflow-y-auto p-2 space-y-2">
      <button class="optimize-btn" @click="runPaletteRecommend" :disabled="loading">
        <span class="text-base">🎨</span>
        <div class="text-left"><div class="font-medium">配色方案推荐</div><div class="text-[9px] text-[var(--ui-text-tertiary)]">基于当前图纸 AI 生成多套配色</div></div>
        <LoaderIcon v-if="loading && action === 'palette'" :size="14" class="animate-spin ml-auto" />
      </button>
      <button class="optimize-btn" @click="runPaletteHarmony" :disabled="loading">
        <span class="text-base">📐</span>
        <div class="text-left"><div class="font-medium">和谐度分析</div><div class="text-[9px] text-[var(--ui-text-tertiary)]">色彩和谐度评分 + 优化建议</div></div>
      </button>
      <button class="optimize-btn" @click="runColorblind" :disabled="loading">
        <span class="text-base">👁️</span>
        <div class="text-left"><div class="font-medium">色弱检查</div><div class="text-[9px] text-[var(--ui-text-tertiary)]">红/绿/蓝色盲模拟</div></div>
      </button>
      <button class="optimize-btn" @click="runCrossBrand" :disabled="loading">
        <span class="text-base">🔄</span>
        <div class="text-left"><div class="font-medium">跨品牌映射</div><div class="text-[9px] text-[var(--ui-text-tertiary)]">Hama → Mideer 色号转换</div></div>
      </button>

      <!-- 推荐配色展示 -->
      <div v-if="paletteResults.length" class="space-y-1.5 pt-2 border-t border-[var(--ui-border)]">
        <div class="text-[10px] font-medium text-[var(--ui-text-secondary)]">推荐配色</div>
        <div v-for="(p, i) in paletteResults" :key="i" class="flex gap-1 items-center p-1.5 rounded-lg hover:bg-[var(--ui-bg-tertiary)] cursor-pointer"
          @click="$emit('applyPalette', p.colors)">
          <div class="flex gap-0.5">
            <div v-for="c in (p.colors||[]).slice(0,6)" :key="c.hex" class="w-4 h-4 rounded-sm ring-1 ring-black/10" :style="{ background: c.hex }" />
          </div>
          <span class="text-[9px] text-[var(--ui-text-tertiary)] ml-auto">{{ p.label || `方案${i+1}` }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { LoaderIcon, UploadIcon } from 'lucide-vue-next'
import API from '@/api/index.js'

const props = defineProps({
  grid: Array,
  gridW: Number,
  gridH: Number,
  gridColorStats: Array,
})

const emit = defineEmits(['applyEnhance', 'applyGenerate', 'applyPalette'])

const tab = ref('optimize')
const loading = ref(false)
const action = ref('')
const error = ref('')

const tabs = [
  { id: 'optimize', label: '⚡ 优化' },
  { id: 'generate', label: '🤖 生成' },
  { id: 'palette', label: '🎨 配色' },
]

// 生成相关
const genPrompt = ref('')
const genBrand = ref('Hama')
const genSize = ref('32')
const genResult = ref(null)

// 模板
const templates = ref([
  { category: '动物', items: ['猫', '狗', '兔子', '小熊', '熊猫', '柴犬', '狐狸', '仓鼠', '龙'] },
  { category: '食物', items: ['草莓', '西瓜', '蛋糕', '冰淇淋', '苹果', '汉堡', '奶茶'] },
  { category: '自然', items: ['花朵', '星星', '爱心', '月亮', '太阳', '彩虹', '蘑菇'] },
  { category: '表情', items: ['笑脸', '爱心眼', '哭脸', '生气'] },
  { category: '物品', items: ['钻石', '皇冠', '火箭', '音符', '相机', '房子', '礼物'] },
])

const activeKeywords = computed(() => {
  const cat = templates.value.find(t => genPrompt.value.includes(t.category))
  return cat ? cat.items : []
})

// 配色结果
const paletteResults = ref([])

// ====== API 调用 ======

async function runEnhance(act) {
  loading.value = true; action.value = act; error.value = ''
  try {
    const res = await API.post('/api/ai/enhance', {
      grid: props.grid,
      action: act,
      options: { targetColors: 8, style: '8bit' },
    })
    if (res.code === 200) emit('applyEnhance', res.data.grid)
  } catch (e) {
    error.value = '优化失败: ' + e.message
  } finally {
    loading.value = false; action.value = ''
  }
}

async function runGenerate() {
  loading.value = true; action.value = 'generate'; error.value = ''; genResult.value = null
  try {
    const res = await API.post('/api/ai/generate', {
      prompt: genPrompt.value.trim(),
      width: parseInt(genSize.value),
      height: parseInt(genSize.value),
      brand: genBrand.value,
    })
    if (res.code === 200) {
      genResult.value = res.data
      emit('applyGenerate', res.data.grid, res.data.gridWidth, res.data.gridHeight)
    }
  } catch (e) {
    error.value = '生成失败: ' + e.message
  } finally {
    loading.value = false; action.value = ''
  }
}

async function runPaletteRecommend() {
  loading.value = true; action.value = 'palette'; error.value = ''
  try {
    const res = await API.post('/api/palette/recommend', {
      colors: (props.gridColorStats || []).map(s => s.hex),
      count: 3,
    })
    if (res.code === 200 && res.data?.palettes) {
      paletteResults.value = res.data.palettes
    }
  } catch (e) {
    error.value = '配色推荐失败'
  } finally {
    loading.value = false; action.value = ''
  }
}

async function runPaletteHarmony() {
  loading.value = true; error.value = ''
  try {
    const res = await API.post('/api/palette/harmony', {
      colors: (props.gridColorStats || []).slice(0, 10).map(s => s.hex),
    })
    if (res.code === 200) {
      paletteResults.value = [{ label: '和谐度分析', ...res.data, colors: props.gridColorStats.slice(0, 10) }]
    }
  } catch (e) {
    error.value = '分析失败'
  } finally {
    loading.value = false
  }
}

async function runColorblind() {
  loading.value = true; error.value = ''
  try {
    const res = await API.post('/api/palette/colorblind', {
      colors: (props.gridColorStats || []).slice(0, 10).map(s => s.hex),
    })
    if (res.code === 200) {
      paletteResults.value = [{ label: '色弱模拟', ...res.data, colors: props.gridColorStats.slice(0, 10) }]
    }
  } catch (e) {
    error.value = '检查失败'
  } finally {
    loading.value = false
  }
}

async function runCrossBrand() {
  loading.value = true; error.value = ''
  try {
    const res = await API.post('/api/palette/cross-brand', {
      colors: (props.gridColorStats || []).map(s => s.hex),
      fromBrand: 'Hama',
      toBrand: 'Mideer',
    })
    if (res.code === 200) {
      paletteResults.value = [{ label: 'Mideer 映射', ...res.data, colors: res.data.mapped || [] }]
    }
  } catch (e) {
    error.value = '映射失败'
  } finally {
    loading.value = false
  }
}

function onLineArtUpload(e) {
  // 线稿上色功能由后端处理，此处占位
  error.value = '线稿上色功能开发中，敬请期待'
}
</script>

<style scoped>
.optimize-btn {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 8px 10px; border-radius: 10px;
  background: var(--ui-bg-tertiary);
  text-align: left; border: none; cursor: pointer;
  transition: all 0.15s;
}
.optimize-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ui-accent) 8%, transparent);
}
.optimize-btn:disabled { opacity: 0.5; cursor: wait; }
</style>
