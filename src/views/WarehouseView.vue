<!-- ============================================
  WarehouseView.vue — 我的仓库（库存 + 图纸 + 清单 + 统计）
  ============================================ -->
<template>
  <div class="flex flex-col h-full" v-if="auth.isLoggedIn.value">
    <!-- Tab 切换 -->
    <div class="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-slate-100 bg-white flex-shrink-0">
      <button v-for="t in tabs" :key="t.key" class="tab-btn" :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key; activeTab === 'purchases' && loadPurchaseLists(); activeTab === 'stats' && loadStats()">
        {{ t.icon }} {{ t.label }}
        <span v-if="t.key === 'inventory' && alertCount" class="tab-badge">{{ alertCount }}</span>
      </button>
    </div>

    <!-- ====== 📦 库存管理 ====== -->
    <div v-if="activeTab === 'inventory'" class="flex-1 overflow-y-auto p-4">
      <div id="scan-reader" v-show="scanning" class="max-w-sm mx-auto mb-3 rounded-xl overflow-hidden" />
      <!-- 扫码结果反馈 -->
      <div v-if="scanResult" class="max-w-sm mx-auto mb-3 px-3 py-2 rounded-lg text-xs text-center font-medium"
        :class="scanResult.includes('已入库') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'">
        {{ scanResult }}
      </div>
      <ColorCardGrid ref="cardGridRef"
        @select-color="openColorDetail"
        @scan="startScan"
        @export="exportCSV"
        @updated="onInventoryUpdated" />
    </div>
    <!-- 色号详情弹窗 -->
    <ColorDetailDialog
      :color-id="detailColorId"
      :visible="showDetailDialog"
      :inventory-item="detailItem"
      @close="showDetailDialog = false"
      @updated="onInventoryUpdated"
      @select-substitute="onSelectSubstitute" />

    <!-- ====== 🎨 图纸管理 ====== -->
    <div v-if="activeTab === 'designs'" class="flex flex-1 overflow-hidden">
      <aside class="w-[200px] min-w-[200px] bg-white border-r border-slate-100 p-3 overflow-y-auto max-md:hidden">
        <h3 class="text-[11px] uppercase tracking-wide text-slate-400 mb-2 font-semibold">📁 文件夹</h3>
        <ul class="space-y-0.5">
          <li class="folder-item" :class="{ active: currentFolder === '' }" @click="switchFolder('')">📋 全部</li>
          <li v-for="f in folders" :key="f.id" class="folder-item" :class="{ active: currentFolder == f.id }"
            @click="switchFolder(String(f.id))">📁 {{ f.name }}<span class="text-[10px] text-slate-400 ml-auto">{{ f.design_count || 0 }}</span></li>
        </ul>
        <button class="w-full mt-2 h-8 text-[11px] text-slate-500 rounded-lg hover:bg-slate-50 transition-colors"
          @click="newFolder">+ 新建文件夹</button>
      </aside>
      <div class="flex-1 overflow-y-auto p-4">
        <div class="flex items-center justify-between mb-4"><h2 class="text-lg font-bold">我的图纸</h2></div>
        <div v-if="designs.length" class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          <DesignCard v-for="d in designs" :key="d.id" :design="d" />
        </div>
        <div v-else class="text-center py-16 text-slate-400">
          <div class="text-5xl mb-3">📭</div>
          <p class="text-sm mb-4">还没有图纸，去创作一个吧！</p>
          <button class="btn-primary" @click="$router.push('/editor')">开始创作</button>
        </div>
      </div>
    </div>

    <!-- ====== 📋 采购清单 ====== -->
    <div v-if="activeTab === 'purchases'" class="flex-1 overflow-y-auto p-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">📋 采购清单</h2>
        <button class="btn-sm-outline" @click="generatePurchaseList">+ 根据图纸生成</button>
      </div>
      <div v-if="purchaseLists.length" class="space-y-4">
        <div v-for="list in purchaseLists" :key="list.id"
          class="bg-white rounded-xl border border-slate-100 p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold text-sm text-slate-800">{{ list.title }}</h3>
            <span class="text-[10px] px-2 py-0.5 rounded-full"
              :class="list.status === 'draft' ? 'bg-slate-100 text-slate-500' : list.status === 'ordered' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'">
              {{ {draft:'草稿',ordered:'已下单',arrived:'已到货',cancelled:'已取消'}[list.status] }}</span>
          </div>
          <div class="space-y-1">
            <div v-for="item in list.items" :key="item.id"
              class="flex items-center gap-2 text-xs text-slate-600">
              <div class="w-4 h-4 rounded-sm ring-1 ring-black/10" :style="{background:item.hex}" />
              <span class="flex-1">{{ item.name }}</span>
              <span class="font-mono">需 {{ item.need_quantity }}颗</span>
              <span v-if="item.purchased_quantity" class="text-emerald-500">已购{{ item.purchased_quantity }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-16 text-slate-400">
        <div class="text-5xl mb-3">📋</div>
        <p class="text-sm">暂无采购清单，点击上方按钮根据图纸生成</p>
      </div>
    </div>

    <!-- ====== 📊 统计 ====== -->
    <div v-if="activeTab === 'stats'" class="flex-1 overflow-y-auto p-4">
      <h2 class="text-lg font-bold mb-4">📊 仓库概览</h2>
      <div class="grid grid-cols-4 gap-3 mb-6">
        <div class="stat-card"><div class="stat-num">{{ statsData?.overview?.tracked_colors || 0 }}</div><div class="stat-label">追踪颜色</div></div>
        <div class="stat-card"><div class="stat-num">{{ (statsData?.overview?.total_in_stock || 0).toLocaleString() }}</div><div class="stat-label">总库存（颗）</div></div>
        <div class="stat-card"><div class="stat-num text-amber-500">{{ statsData?.overview?.total_in_transit || 0 }}</div><div class="stat-label">运输中</div></div>
        <div class="stat-card"><div class="stat-num text-blue-500">{{ alertCount }}</div><div class="stat-label">需补豆</div></div>
      </div>
      <StatsCharts />
    </div>
  </div>
  <div v-else class="flex items-center justify-center h-full text-slate-400">请先登录</div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'
import { useDialog } from '@/composables/useDialog.js'
import DesignCard from '@/components/DesignCard.vue'
import ColorCardGrid from '@/components/inventory/ColorCardGrid.vue'
import ColorDetailDialog from '@/components/inventory/ColorDetailDialog.vue'
import StatsCharts from '@/components/inventory/StatsCharts.vue'

let html5QrCode = null

const router = useRouter()
const auth = useAuth()
const toast = useToast()
const dialog = useDialog()

const tabs = [
  { key: 'inventory', label: '库存', icon: '📦' },
  { key: 'designs', label: '图纸', icon: '🎨' },
  { key: 'purchases', label: '清单', icon: '📋' },
  { key: 'stats', label: '统计', icon: '📊' },
]
const activeTab = ref('inventory')

// 色号详情弹窗
const cardGridRef = ref(null)
const showDetailDialog = ref(false)
const detailColorId = ref(null)
const detailItem = ref(null)

// 图纸
const folders = ref([])
const designs = ref([])
const currentFolder = ref('')

// 采购清单
const purchaseLists = ref([])

// 统计
const statsData = ref(null)
const alertCount = ref(0)

// 扫码
const scanning = ref(false)
const scanResult = ref('')

// 色号详情
function openColorDetail(item) {
  detailColorId.value = item.color_id
  detailItem.value = item
  showDetailDialog.value = true
}

function onInventoryUpdated() {
  cardGridRef.value?.refresh()
  loadAlertsForBadge()
}

function onSelectSubstitute(alt) {
  // 选中替代色后，打开替代色的详情
  detailColorId.value = alt.colorId
  detailItem.value = { color_id: alt.colorId, ...alt }
}

async function loadAlertsForBadge() {
  try {
    const res = await API.get('/api/inventory/alerts', true)
    if (res.code === 200) alertCount.value = (res.data?.items || []).length
  } catch (_) {}
}

async function startScan() {
  if (scanning.value) { stopScan(); return }
  try {
    const { Html5Qrcode } = await import('html5-qrcode')
    html5QrCode = new Html5Qrcode('scan-reader')
    scanning.value = true
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 250 },
      async (decodedText) => {
        // 解析条形码：假设格式为 "品牌-色号" 或纯数字
        const code = decodedText.trim()
        const match = code.match(/([A-Za-z]+\d+)/)
        const searchTerm = match ? match[1] : code
        // 在所有颜色中搜索
        const res = await API.get('/api/beads/colors', false)
        const colors = res.data || []
        const found = colors.find(c =>
          c.name?.toUpperCase() === searchTerm.toUpperCase() ||
          c.hex?.toUpperCase() === searchTerm.toUpperCase()
        )
        if (found) {
          await API.post('/api/inventory', { colorId: found.id, quantity: 100, note: '扫码入库' }, true)
          scanResult.value = `已入库: ${found.name} +100颗`
          cardGridRef.value?.refresh()
          setTimeout(() => { scanResult.value = '' }, 2000)
        } else {
          scanResult.value = `未找到色号: ${searchTerm}`
          setTimeout(() => { scanResult.value = '' }, 2000)
        }
      },
      (err) => { /* 扫描中 */ }
    )
  } catch (e) {
    scanning.value = false
    toast.show('扫码启动失败，请检查摄像头权限')
  }
}

function stopScan() {
  if (html5QrCode) {
    try { html5QrCode.stop() } catch (_) {}
    html5QrCode = null
  }
  scanning.value = false
}

async function exportCSV() {
  try {
    const token = auth.token?.value
    if (!token) { toast.show('请先登录'); return }
    const a = document.createElement('a')
    a.href = '/api/inventory/export-csv'
    // 添加认证头通过 URL 参数或直接 fetch
    const resp = await fetch('/api/inventory/export-csv', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    a.href = url; a.download = '拼豆库存.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.show('CSV 导出成功')
  } catch (e) { toast.show('导出失败') }
}

onUnmounted(() => { stopScan() })

onMounted(async () => {
  if (!auth.isLoggedIn.value) return
  await Promise.all([loadAlertsForBadge(), loadFolders(), loadDesigns()])
})

async function loadPurchaseLists() {
  try {
    const res = await API.get('/api/inventory/purchase-lists', true)
    if (res.code === 200) purchaseLists.value = res.data || []
  } catch (_) {}
}

async function loadStats() {
  try {
    const res = await API.get('/api/inventory/stats', true)
    if (res.code === 200) statsData.value = res.data
  } catch (_) {}
}

async function generatePurchaseList() {
  const title = await dialog.prompt('清单名称', '采购清单', '拼豆采购清单')
  if (!title) return
  try {
    const res = await API.post('/api/inventory/purchase-list', { title }, true)
    toast.show(res.message || '已生成')
    await loadPurchaseLists()
  } catch (e) { toast.show(e.message) }
}

// 图纸管理
async function loadFolders() {
  try { const res = await API.get('/api/folders'); folders.value = res.data || [] } catch (_) {}
}
async function loadDesigns() {
  try {
    const url = '/api/designs' + (currentFolder.value ? '?folder_id=' + currentFolder.value : '')
    const res = await API.get(url); designs.value = res.data?.list || []
  } catch (_) {}
}
function switchFolder(id) { currentFolder.value = id; loadDesigns() }
async function newFolder() {
  const name = await dialog.prompt('请输入文件夹名称', '新建文件夹', '', '文件夹名称')
  if (!name) return
  try { await API.post('/api/folders', { name }); await loadFolders() } catch (e) { toast.show(e.message) }
}
</script>

<style scoped>
.tab-btn {
  @apply relative px-4 py-1.5 rounded-lg text-xs font-medium text-slate-500
         hover:bg-slate-100 transition-colors cursor-pointer;
}
.tab-btn.active { @apply bg-primary/10 text-primary font-semibold; }
.tab-badge {
  @apply absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white
         text-[9px] flex items-center justify-center font-bold;
}
.btn-sm-outline {
  @apply h-7 px-3 rounded-lg text-[11px] font-medium border border-slate-200 text-slate-500
         hover:bg-slate-50 transition-colors;
}
.folder-item {
  @apply px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-500 cursor-pointer
         flex items-center gap-1.5 transition-all duration-100;
}
.folder-item:hover { @apply bg-slate-50; }
.folder-item.active { @apply bg-primary-lighter text-primary; }
.btn-primary {
  @apply inline-flex items-center h-9 px-4 rounded-full text-[13px] font-semibold
         bg-primary text-white border-none transition-all duration-150;
}
.btn-primary:hover { @apply bg-primary-dark; }
.stat-card {
  @apply bg-white rounded-xl border border-slate-100 p-4 text-center;
}
.stat-num { @apply text-2xl font-bold text-slate-800; }
.stat-label { @apply text-[10px] text-slate-400 mt-1; }
</style>
