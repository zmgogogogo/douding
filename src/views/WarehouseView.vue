<!-- ============================================
  WarehouseView.vue — 我的仓库（库存 + 图纸 + 清单 + 统计）
  ============================================ -->
<template>
  <div class="flex flex-col h-full" v-if="auth.isLoggedIn.value">
    <!-- Tab 切换 -->
    <div class="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-slate-100 bg-white flex-shrink-0">
      <button v-for="t in tabs" :key="t.key" class="tab-btn" :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key; activeTab === 'inventory' && loadInventory(); activeTab === 'purchases' && loadPurchaseLists(); activeTab === 'stats' && loadStats()">
        {{ t.icon }} {{ t.label }}
        <span v-if="t.key === 'inventory' && alertCount" class="tab-badge">{{ alertCount }}</span>
      </button>
    </div>

    <!-- ====== 📦 库存管理 ====== -->
    <div v-if="activeTab === 'inventory'" class="flex-1 overflow-y-auto p-4">
      <div id="scan-reader" v-show="scanning" class="max-w-sm mx-auto mb-3 rounded-xl overflow-hidden" />
      <!-- 顶部操作栏 -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold">📦 珠子库存</h2>
          <span class="text-xs text-slate-400">
            {{ stats?.totalColors || 0 }}色 · {{ (stats?.totalBeads || 0).toLocaleString() }}颗
            <span v-if="stats?.totalTransit" class="text-amber-500"> + {{ stats.totalTransit }}运输中</span>
          </span>
        </div>
        <div class="flex gap-2">
          <button class="btn-sm-outline" @click="startScan">📷 扫码</button>
          <button class="btn-sm-outline" @click="showAddDialog = true">+ 入库</button>
          <button class="btn-sm-outline" @click="exportCSV">📥 CSV</button>
          <button class="btn-sm-outline" @click="loadInventory">🔄</button>
        </div>
        <!-- 扫码状态 -->
        <div v-if="scanning" class="text-[10px] text-blue-500 mt-1">📷 对准条形码...</div>
        <div v-if="scanResult" class="text-[10px] text-emerald-500 mt-1">✅ {{ scanResult }}</div>
      </div>

      <!-- 预警提示条 -->
      <div v-if="alerts.length" class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm">
        <span class="font-semibold text-amber-700">⚠️ {{ alerts.length }} 种颜色需补豆：</span>
        <span class="text-amber-600">
          <span v-if="outOfStock.length">{{ outOfStock.length }}种已用尽</span>
          <span v-if="outOfStock.length && runningLow.length">，</span>
          <span v-if="runningLow.length">{{ runningLow.length }}种库存偏低</span>
        </span>
      </div>

      <!-- 库存列表 -->
      <div v-if="inventory.length" class="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table class="w-full text-xs">
          <thead class="bg-slate-50 border-b border-slate-100">
            <tr class="text-slate-500">
              <th class="px-3 py-2 text-left w-8">#</th>
              <th class="px-3 py-2 text-left">颜色</th>
              <th class="px-3 py-2 text-right w-16">库存</th>
              <th class="px-3 py-2 text-right w-16">运输中</th>
              <th class="px-3 py-2 text-right w-12">预警</th>
              <th class="px-3 py-2 text-right w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in inventory" :key="item.color_id"
              class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
              :class="{ 'bg-red-50/50': item.quantity === 0 && item.min_threshold > 0, 'bg-amber-50/30': item.quantity > 0 && item.min_threshold > 0 && item.quantity <= item.min_threshold }">
              <td class="px-3 py-2 text-slate-400">{{ i + 1 }}</td>
              <td class="px-3 py-2 flex items-center gap-2">
                <div class="w-5 h-5 rounded ring-1 ring-black/10 flex-shrink-0" :style="{ background: item.hex }" />
                <span class="font-medium text-slate-700">{{ item.name }}</span>
                <span class="text-[10px] text-slate-400 font-mono">{{ item.hex }}</span>
              </td>
              <td class="px-3 py-2 text-right font-mono font-semibold"
                :class="item.quantity === 0 && item.min_threshold > 0 ? 'text-red-500' : 'text-slate-700'">
                {{ item.quantity }}
              </td>
              <td class="px-3 py-2 text-right text-slate-400">
                <span v-if="item.transit_quantity">{{ item.transit_quantity }}</span>
                <span v-else class="text-slate-300">-</span>
              </td>
              <td class="px-3 py-2 text-right">
                <input type="number" :value="item.min_threshold || ''"
                  class="w-10 h-6 text-center border border-slate-200 rounded text-[10px] outline-none focus:border-primary"
                  placeholder="-" min="0"
                  @blur="setThreshold(item.color_id, $event.target.value)" />
              </td>
              <td class="px-3 py-2 text-right">
                <div class="flex items-center justify-end gap-1">
                  <input type="number"
                    class="w-12 h-6 text-center border border-slate-200 rounded text-[10px] outline-none focus:border-primary"
                    placeholder="数量" min="1"
                    @keydown.enter="addStock(item.color_id, $event.target.value, $event)" />
                  <button class="text-[10px] text-primary hover:underline flex-shrink-0"
                    @click="addStock(item.color_id, 100)">+100</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-center py-16 text-slate-400">
        <div class="text-5xl mb-3">📦</div>
        <p class="text-sm">还没有库存记录，点击"+ 入库"添加珠子</p>
      </div>

      <!-- 入库弹窗 -->
      <div v-if="showAddDialog" class="fixed inset-0 z-[150] flex items-center justify-center bg-black/30 backdrop-blur-sm"
        @click.self="showAddDialog = false">
        <div class="bg-white rounded-2xl shadow-xl p-5 w-[360px] max-w-[90vw] space-y-4 animate-bounce-in">
          <h3 class="font-bold text-slate-800">入库珠子</h3>
          <div class="space-y-2">
            <select v-model="addForm.colorId" class="w-full h-9 border border-slate-200 rounded-lg text-xs px-2 bg-slate-50">
              <option :value="null">选择颜色...</option>
              <option v-for="c in allColors" :key="c.id" :value="c.id">{{ c.brand }} · {{ c.name }} {{ c.hex }}</option>
            </select>
            <div class="flex gap-2">
              <input v-model.number="addForm.quantity" type="number" min="1"
                class="flex-1 h-9 border border-slate-200 rounded-lg text-xs px-2 text-center" placeholder="数量" />
              <input v-model.number="addForm.threshold" type="number" min="0"
                class="w-20 h-9 border border-slate-200 rounded-lg text-xs px-2 text-center" placeholder="预警值" />
            </div>
            <input v-model="addForm.note" placeholder="备注（可选）"
              class="w-full h-9 border border-slate-200 rounded-lg text-xs px-2" />
          </div>
          <div class="flex gap-2">
            <button class="flex-1 h-9 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium" @click="showAddDialog = false">取消</button>
            <button class="flex-1 h-9 rounded-xl bg-primary text-white text-xs font-medium" @click="doAddStock">确认入库</button>
          </div>
        </div>
      </div>
    </div>

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
      <div v-if="statsData?.topConsumed?.length" class="bg-white rounded-xl border border-slate-100 p-4">
        <h3 class="font-semibold text-sm text-slate-700 mb-2">🔥 消耗最多颜色 Top 10</h3>
        <div class="space-y-1">
          <div v-for="(c, i) in statsData.topConsumed" :key="i"
            class="flex items-center gap-2 text-xs">
            <span class="text-slate-400 w-4">{{ i+1 }}</span>
            <div class="w-4 h-4 rounded-sm ring-1 ring-black/10" :style="{background:c.hex}" />
            <span class="flex-1 text-slate-600">{{ c.name }}</span>
            <span class="font-mono text-slate-500">{{ c.total }}颗</span>
            <div class="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full" :style="{width: (c.total/(statsData.topConsumed[0]?.total||1)*100)+'%'}" />
            </div>
          </div>
        </div>
      </div>
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

// 库存
const inventory = ref([])
const stats = ref(null)
const alerts = ref([])
const outOfStock = computed(() => alerts.value.filter(i => i.quantity === 0))
const runningLow = computed(() => alerts.value.filter(i => i.quantity > 0))
const alertCount = computed(() => alerts.value.length)
const allColors = ref([])
const showAddDialog = ref(false)
const addForm = ref({ colorId: null, quantity: 10, threshold: 0, note: '' })

// 图纸
const folders = ref([])
const designs = ref([])
const currentFolder = ref('')

// 采购清单
const purchaseLists = ref([])

// 统计
const statsData = ref(null)

// 扫码
const scanning = ref(false)
const scanResult = ref('')

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
          await loadInventory()
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
  await Promise.all([loadInventory(), loadAlerts(), loadAllColors(), loadFolders(), loadDesigns()])
})

async function loadInventory() {
  try {
    const res = await API.get('/api/inventory', true)
    if (res.code === 200) { inventory.value = res.data?.items || []; stats.value = res.data?.stats }
    else toast.show(res.message || '加载库存失败')
  } catch (e) { toast.show('加载库存失败: ' + (e.message || '网络错误')) }
}

async function loadAlerts() {
  try {
    const res = await API.get('/api/inventory/alerts', true)
    if (res.code === 200) { alerts.value = res.data.items || [] }
  } catch (_) {}
}

async function loadAllColors() {
  try {
    const res = await API.get('/api/beads/colors')
    if (res.code === 200) allColors.value = res.data || []
  } catch (_) {}
}

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

async function addStock(colorId, qty, event) {
  if (!qty || qty <= 0) return
  try {
    await API.post('/api/inventory', { colorId, quantity: parseInt(qty) }, true)
    toast.show(`入库 ${qty} 颗`)
    await loadInventory()
    if (event) event.target.value = ''
  } catch (e) { toast.show(e.message) }
}

async function doAddStock() {
  if (!addForm.value.colorId) { toast.show('请选择颜色'); return }
  if (!addForm.value.quantity || addForm.value.quantity <= 0) { toast.show('请输入有效数量'); return }
  try {
    const res = await API.post('/api/inventory', {
      colorId: parseInt(addForm.value.colorId),
      quantity: parseInt(addForm.value.quantity),
      minThreshold: addForm.value.threshold || 0,
      note: addForm.value.note || ''
    }, true)
    if (res.code === 200) {
      toast.show(`入库 ${addForm.value.quantity} 颗`)
      showAddDialog.value = false
      addForm.value = { colorId: null, quantity: 10, threshold: 0, note: '' }
      await loadInventory()
    } else {
      toast.show(res.message || '入库失败')
    }
  } catch (e) { toast.show(e.message || '入库失败，请稍后重试') }
}

async function setThreshold(colorId, value) {
  const v = parseInt(value) || 0
  try {
    await API.put(`/api/inventory/${colorId}`, { minThreshold: v }, true)
    await loadInventory(); await loadAlerts()
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
