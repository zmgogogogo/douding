<!-- ============================================
  DetailView.vue — 设计详情页
============================================ -->
<template>
  <div class="overflow-y-auto h-full">
    <div v-if="design" class="max-w-[900px] mx-auto p-5">
      <!-- 头部：预览 + 信息 -->
      <div class="flex gap-4 mb-5 max-sm:flex-col max-sm:items-center">
        <div class="w-40 h-40 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
          <canvas ref="previewCanvas" class="w-full h-full pixel-thumb" />
        </div>
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold mb-1">{{ design.title }}</h1>
          <div class="text-xs text-slate-500 mb-2">
            作者
            <span class="text-primary font-semibold cursor-pointer"
              @click="$router.push(`/user/${author?.id}`)">{{ author?.nickname || author?.username || '匿名' }}</span>
          </div>
          <div class="text-[13px] text-slate-500 leading-relaxed mb-3">{{ design.description || '暂无描述' }}</div>
          <div class="flex gap-4 text-xs text-slate-400 mb-3">
            <span>📐 {{ design.gridWidth }}×{{ design.gridHeight }}</span>
            <span>🧩 {{ design.beadCount || 0 }}颗</span>
            <span>🎨 {{ colors.length }}色</span>
            <span>❤ {{ design.likesCount || 0 }}</span>
            <span>👁 {{ (design.viewsCount || 0) + 1 }}</span>
          </div>
          <!-- 操作按钮 -->
          <div class="flex gap-2">
            <button
              class="h-9 px-4 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95"
              :class="design.liked ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'"
              @click="toggleLike">{{ design.liked ? '❤️ 已赞' : '🤍 点赞' }}</button>
            <template v-if="auth.user?.value?.id === design.userId">
              <button class="h-9 px-4 rounded-full text-xs font-medium border border-slate-200 bg-white
                             text-slate-600 hover:bg-slate-50 transition-all duration-150"
                @click="$router.push(`/editor/${design.id}`)">✏️ 编辑</button>
              <button class="h-9 px-4 rounded-full text-xs font-medium bg-red-50 text-red-500
                             border border-transparent hover:bg-red-100 transition-all duration-150"
                @click="handleDelete">🗑 删除</button>
            </template>
          </div>
        </div>
      </div>

      <!-- 颜色统计 -->
      <div class="flex flex-wrap gap-1.5">
        <span v-for="c in colors" :key="c.hex"
          class="inline-flex items-center gap-1 bg-slate-50 rounded-full pl-1 pr-2.5 py-1 text-[11px] text-slate-500">
          <span class="w-[18px] h-[18px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]" :style="{ background: c.hex }" />
          {{ c.name }} ×{{ c.count }}
        </span>
      </div>

      <!-- 豆仓匹配栏 -->
      <WarehouseMatchBar v-if="design" :design-id="design.id" :design-title="design.title" />
    </div>

    <!-- 加载/错误 -->
    <div v-if="loading" class="text-center py-20 text-slate-400 text-sm">加载中...</div>
    <div v-if="error" class="text-center py-20 text-slate-400 text-sm">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import API from '@/api/index.js'
import WarehouseMatchBar from '@/components/inventory/WarehouseMatchBar.vue'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'
import { useDialog } from '@/composables/useDialog.js'
import { countColorsByGrid } from '@/utils/colors.js'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const toast = useToast()
const dialog = useDialog()

const design = ref(null)
const author = ref(null)
const colors = ref([])
const loading = ref(true)
const error = ref('')
const previewCanvas = ref(null)

onMounted(async () => {
  await fetchDetail()
})

const isLoggedIn = computed(() => auth.isLoggedIn.value)

async function fetchDetail() {
  try {
    const res = await API.get('/api/designs/' + route.params.id, auth.isLoggedIn.value)
    design.value = res.data
    author.value = res.data.author
    colors.value = countColorsByGrid(res.data.gridData)
    nextTick(renderPreview)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function renderPreview() {
  const canvas = previewCanvas.value
  if (!canvas || !design.value) return
  const d = design.value
  const size = 160
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')
  const grid = Array.isArray(d.gridData) ? d.gridData : []
  const cellW = size / Math.max(d.gridWidth, d.gridHeight)
  for (let r = 0; r < Math.min(grid.length, d.gridHeight); r++) {
    const row = grid[r] || []
    for (let c = 0; c < Math.min(row.length, d.gridWidth); c++) {
      const cell = row[c]
      if (cell?.hex) {
        ctx.fillStyle = cell.hex
        ctx.fillRect(c * cellW, r * cellW, cellW, cellW)
      }
    }
  }
}

async function toggleLike() {
  if (!auth.isLoggedIn.value) return router.push('/login')
  try {
    const res = await API.post('/api/designs/' + design.value.id + '/like', {})
    design.value.liked = res.data.liked
    design.value.likesCount += res.data.liked ? 1 : -1
    toast.show(res.data.liked ? '已点赞 ❤️' : '已取消点赞')
  } catch (e) {
    toast.show(e.message)
  }
}

async function handleDelete() {
  if (!await dialog.confirm('确定删除这个图纸吗？此操作不可撤销。', '删除确认')) return
  try {
    await API.del('/api/designs/' + design.value.id)
    toast.show('已删除')
    router.push('/warehouse')
  } catch (e) {
    toast.show(e.message)
  }
}
</script>
