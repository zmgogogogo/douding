<!-- ============================================
  TemplateListView.vue — 模板/作品管理列表（含预览弹窗）
============================================ -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">📝 模板管理</h2>
    </div>

    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="5">
          <el-input v-model="filters.keyword" placeholder="搜索标题/ID" clearable @keyup.enter="search" />
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.status" placeholder="审核状态" clearable @change="search">
            <el-option label="已发布" :value="1" />
            <el-option label="待审核" :value="0" />
            <el-option label="已驳回" :value="-1" />
            <el-option label="已下架" :value="-2" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.isPublic" placeholder="公开状态" clearable @change="search">
            <el-option label="公开" :value="1" />
            <el-option label="私有" :value="0" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="search">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="mt-4">
      <!-- 批量操作 -->
      <div class="batch-bar" v-if="selectedIds.length">
        <span>已选 {{ selectedIds.length }} 项</span>
        <el-button size="small" type="success" @click="batchReview(1)">批量通过</el-button>
        <el-button size="small" type="danger" @click="batchReview(-1)">批量驳回</el-button>
        <el-button size="small" type="warning" @click="batchReview(-2)">批量下架</el-button>
      </div>

      <el-table :data="list" v-loading="loading" @selection-change="onSelectionChange" stripe>
        <el-table-column type="selection" width="40" />
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="缩略图" width="70">
          <template #default="{ row }">
            <img
              v-if="row.thumbnail || thumbCache[row.id]"
              :src="thumbCache[row.id] || row.thumbnail"
              class="thumb-img clickable"
              @click="openPreview(row)"
              title="点击预览"
            />
            <div v-else class="thumb-placeholder" title="加载中...">⏳</div>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
        <el-table-column prop="authorName" label="作者" width="100" show-overflow-tooltip />
        <el-table-column label="尺寸" width="90" align="center">
          <template #default="{ row }">{{ row.gridWidth }}×{{ row.gridHeight }}</template>
        </el-table-column>
        <el-table-column prop="beadCount" label="豆子数" width="80" align="center" />
        <el-table-column prop="colorCount" label="颜色数" width="70" align="center" />
        <el-table-column prop="likesCount" label="点赞" width="60" align="center" />
        <el-table-column prop="viewsCount" label="浏览" width="60" align="center" />
        <el-table-column label="公开" width="60" align="center">
          <template #default="{ row }"><el-tag :type="row.isPublic ? 'success' : 'info'" size="small">{{ row.isPublic ? '是' : '否' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }"><el-tag :type="statusTag(row.status)" size="small">{{ statusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="140" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openPreview(row)">预览</el-button>
            <el-button size="small" type="success" v-if="row.status !== 1 && row.status !== -2" @click="review(row, 1)">通过</el-button>
            <el-button size="small" type="success" v-if="row.status === -2" @click="review(row, 1)">上架</el-button>
            <el-button size="small" type="warning" v-if="row.status !== -1 && row.status !== -2" @click="review(row, -1)">驳回</el-button>
            <el-button size="small" type="warning" v-if="row.status !== -2" @click="review(row, -2)">下架</el-button>
            <el-popconfirm title="确定物理删除？此操作不可撤销！" @confirm="physicalDelete(row)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-box">
        <el-pagination
          v-model:current-page="page" v-model:page-size="limit"
          :total="total" :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next" @change="loadData"
        />
      </div>
    </el-card>

    <!-- ========== 作品预览弹窗 ========== -->
    <el-dialog
      v-model="previewVisible"
      :title="`作品预览 — ${previewData.title || ''}`"
      width="860px"
      top="5vh"
      destroy-on-close
      class="preview-dialog"
    >
      <div class="preview-body" v-loading="previewLoading">
        <div class="preview-canvas-box">
          <canvas ref="previewCanvasRef" class="preview-canvas"></canvas>
        </div>
        <div class="preview-info">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="作品ID">{{ previewData.id }}</el-descriptions-item>
            <el-descriptions-item label="标题">{{ previewData.title }}</el-descriptions-item>
            <el-descriptions-item label="作者">{{ previewData.authorName }}</el-descriptions-item>
            <el-descriptions-item label="网格尺寸">{{ previewData.gridWidth }} × {{ previewData.gridHeight }}</el-descriptions-item>
            <el-descriptions-item label="豆子数">{{ previewData.beadCount }}</el-descriptions-item>
            <el-descriptions-item label="颜色数">{{ previewData.colorCount }}</el-descriptions-item>
            <el-descriptions-item label="品牌">{{ previewData.brand }}</el-descriptions-item>
            <el-descriptions-item label="点赞数">{{ previewData.likesCount }}</el-descriptions-item>
            <el-descriptions-item label="浏览数">{{ previewData.viewsCount }}</el-descriptions-item>
            <el-descriptions-item label="是否公开">
              <el-tag :type="previewData.isPublic ? 'success' : 'info'" size="small">{{ previewData.isPublic ? '是' : '否' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="推荐">
              <el-tag :type="previewData.isRecommended ? 'warning' : 'info'" size="small">{{ previewData.isRecommended ? '是' : '否' }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>

          <!-- 操作按钮 -->
          <div class="preview-actions">
            <el-button v-if="previewData.status !== 1" type="success" @click="reviewFromPreview(1)">✅ 通过</el-button>
            <el-button v-if="previewData.status !== -1" type="warning" @click="reviewFromPreview(-1)">❌ 驳回</el-button>
            <el-button v-if="previewData.status !== -2" type="warning" @click="reviewFromPreview(-2)">📦 下架</el-button>
            <el-popconfirm title="物理删除后数据无法恢复！" @confirm="physicalDeleteFromPreview">
              <template #reference>
                <el-button type="danger">🗑 物理删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import adminAPI from '@/api/admin.js'

// ===== 列表 =====
const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const selectedIds = ref([])
const thumbCache = reactive({}) // 自动生成的缩略图缓存: { [id]: dataUrl }

const filters = reactive({ keyword: '', status: null, isPublic: null })

function onSelectionChange(rows) { selectedIds.value = rows.map((r) => r.id) }

async function loadData() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: page.value, limit: limit.value })
    if (filters.keyword) params.set('keyword', filters.keyword)
    if (filters.status != null) params.set('status', filters.status)
    if (filters.isPublic != null) params.set('isPublic', filters.isPublic)

    const res = await adminAPI.get(`/api/admin/templates?${params}`)
    list.value = res.data.list
    total.value = res.data.total
    // 为没有缩略图的设计自动生成
    generateMissingThumbnails()
  } catch (err) {
    ElMessage.error('加载模板列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 为当前列表中缺少缩略图的设计自动生成缩略图
 * 异步请求每个设计的 gridData，用 Canvas 渲染为 dataUrl
 */
async function generateMissingThumbnails() {
  for (const row of list.value) {
    if (row.thumbnail || thumbCache[row.id]) continue // 已有缩略图，跳过
    try {
      const res = await adminAPI.get(`/api/admin/templates/${row.id}`)
      const d = res.data
      if (d.gridData) {
        thumbCache[row.id] = renderThumbnail(d.gridData, d.gridWidth, d.gridHeight)
      }
    } catch {
      // 获取失败就保持 ⏳，用户仍可点击预览
    }
  }
}

/** 将 gridData 渲染为 48×48 的小缩略图 dataUrl */
function renderThumbnail(gridData, gridWidth, gridHeight) {
  let data
  if (typeof gridData === 'string') {
    try { data = JSON.parse(gridData) } catch { return '' }
  } else {
    data = gridData
  }
  if (!Array.isArray(data) || data.length === 0) return ''

  const size = 48 // 固定缩略图尺寸
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // 空画板背景
  ctx.fillStyle = '#e8e8e8'
  ctx.fillRect(0, 0, size, size)

  const rows = data.length
  const cols = gridWidth || (data[0]?.length || 1)
  const cellW = size / cols
  const cellH = size / rows

  for (let row = 0; row < rows; row++) {
    const rowData = data[row]
    if (!Array.isArray(rowData)) continue
    for (let col = 0; col < Math.min(rowData.length, cols); col++) {
      const bead = rowData[col]
      if (bead && bead.hex) {
        ctx.fillStyle = bead.hex
        ctx.fillRect(col * cellW, row * cellH, Math.ceil(cellW), Math.ceil(cellH))
      }
    }
  }

  return canvas.toDataURL('image/png')
}

function search() { page.value = 1; loadData() }
function resetFilters() {
  filters.keyword = ''
  filters.status = null
  filters.isPublic = null
  search()
}

async function review(row, status) {
  const labels = { 1: '通过', '-1': '驳回', '-2': '下架' }
  try {
    await ElMessageBox.confirm(
      `确认${labels[String(status)]}该作品？`,
      labels[String(status)],
      { confirmButtonText: '确认', cancelButtonText: '取消' }
    )
    await adminAPI.put(`/api/admin/templates/${row.id}/status`, { status, comment: '' })
    ElMessage.success('操作成功')
    loadData()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.message || '操作失败')
  }
}

/** 物理删除 */
async function physicalDelete(row) {
  try {
    await adminAPI.del(`/api/admin/templates/${row.id}`)
    ElMessage.success('已永久删除')
    loadData()
  } catch (err) {
    ElMessage.error(err.message || '删除失败')
  }
}

async function batchReview(status) {
  try {
    await ElMessageBox.confirm(
      `确认批量操作 ${selectedIds.value.length} 个作品？`,
      '批量操作',
      { confirmButtonText: '确认', cancelButtonText: '取消' }
    )
    await adminAPI.post('/api/admin/templates/batch-status', { ids: selectedIds.value, status, comment: '' })
    ElMessage.success('操作成功')
    loadData()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.message || '操作失败')
  }
}

// ===== 预览弹窗 =====
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewCanvasRef = ref(null)
const previewData = reactive({
  id: null, title: '', authorName: '', gridWidth: 0, gridHeight: 0,
  beadCount: 0, colorCount: 0, brand: '', likesCount: 0, viewsCount: 0,
  isPublic: false, isRecommended: false, status: null,
})

async function openPreview(row) {
  previewVisible.value = true
  previewLoading.value = true
  // 先填入已知数据
  Object.assign(previewData, {
    id: row.id, title: row.title, authorName: row.authorName,
    gridWidth: row.gridWidth, gridHeight: row.gridHeight,
    beadCount: row.beadCount, colorCount: row.colorCount,
    brand: row.brand, likesCount: row.likesCount, viewsCount: row.viewsCount,
    isPublic: row.isPublic, isRecommended: row.isRecommended, status: row.status,
  })

  try {
    const res = await adminAPI.get(`/api/admin/templates/${row.id}`)
    const d = res.data
    // 更新详情数据
    Object.assign(previewData, {
      id: d.id, title: d.title, authorName: d.authorName,
      gridWidth: d.gridWidth, gridHeight: d.gridHeight,
      beadCount: d.beadCount, colorCount: d.colorCount,
      brand: d.brand, likesCount: d.likesCount, viewsCount: d.viewsCount,
      isPublic: d.isPublic, isRecommended: d.isRecommended, status: d.status,
    })

    // 渲染 Canvas
    await nextTick()
    if (d.gridData) renderGridData(d.gridData, d.gridWidth, d.gridHeight)
  } catch (err) {
    // 如果获取详情失败，用列表中的 thumbnail 兜底
    if (row.thumbnail) {
      await nextTick()
      drawThumbnailFallback(row.thumbnail)
    }
  } finally {
    previewLoading.value = false
  }
}

/** 将 gridData JSON 渲染到 Canvas（像素完美） */
function renderGridData(gridData, gridWidth, gridHeight) {
  const canvas = previewCanvasRef.value
  if (!canvas) return

  let data
  if (typeof gridData === 'string') {
    try { data = JSON.parse(gridData) } catch { return }
  } else {
    data = gridData
  }
  if (!Array.isArray(data) || data.length === 0) return

  // 每个珠子渲染为 N×N 像素（根据网格大小自适应）
  const maxDisplaySize = 480
  const cellSize = Math.max(2, Math.floor(maxDisplaySize / Math.max(gridWidth, gridHeight)))
  const canvasW = gridWidth * cellSize
  const canvasH = data.length * cellSize

  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')

  // 先填充灰色背景（代表空画板）
  ctx.fillStyle = '#e0e0e0'
  ctx.fillRect(0, 0, canvasW, canvasH)

  // 逐像素绘制珠子
  for (let row = 0; row < data.length; row++) {
    const rowData = data[row]
    if (!Array.isArray(rowData)) continue
    for (let col = 0; col < rowData.length; col++) {
      const bead = rowData[col]
      if (bead && bead.hex) {
        ctx.fillStyle = bead.hex
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)
      }
    }
  }
}

/** 兜底：直接展示缩略图 */
function drawThumbnailFallback(thumbnailUrl) {
  const canvas = previewCanvasRef.value
  if (!canvas) return
  const img = new Image()
  img.onload = () => {
    canvas.width = img.width
    canvas.height = img.height
    canvas.getContext('2d').drawImage(img, 0, 0)
  }
  img.src = thumbnailUrl
}

/** 从预览弹窗中审核 */
async function reviewFromPreview(status) {
  const labels = { 1: '通过', '-1': '驳回', '-2': '下架' }
  try {
    await ElMessageBox.confirm(
      `确认${labels[String(status)]}该作品？`,
      labels[String(status)],
      { confirmButtonText: '确认', cancelButtonText: '取消' }
    )
    await adminAPI.put(`/api/admin/templates/${previewData.id}/status`, { status, comment: '' })
    ElMessage.success('操作成功')
    previewVisible.value = false
    loadData()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.message || '操作失败')
  }
}

/** 从预览弹窗中物理删除 */
async function physicalDeleteFromPreview() {
  try {
    await adminAPI.del(`/api/admin/templates/${previewData.id}`)
    ElMessage.success('已永久删除')
    previewVisible.value = false
    loadData()
  } catch (err) {
    ElMessage.error(err.message || '删除失败')
  }
}

function statusTag(s) { return s === 1 ? 'success' : s === 0 ? 'warning' : s === -1 ? 'danger' : 'info' }
function statusText(s) { return s === 1 ? '已发布' : s === 0 ? '待审核' : s === -1 ? '已驳回' : s === -2 ? '已下架' : '未知' }

onMounted(loadData)
</script>

<style scoped>
.page-container { max-width: 1400px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.filter-card { border-radius: 12px; }
.pagination-box { display: flex; justify-content: flex-end; margin-top: 16px; }
.batch-bar { display: flex; align-items: center; gap: 8px; padding: 8px 0; margin-bottom: 8px; border-bottom: 1px solid #ebeef5; }
.thumb-img { width: 48px; height: 48px; object-fit: cover; border-radius: 4px; image-rendering: pixelated; }
.thumb-placeholder { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; font-size: 24px; background: #f0f2f5; border-radius: 4px; }
.clickable { cursor: pointer; transition: transform 0.15s; }
.clickable:hover { transform: scale(1.15); }
.mt-4 { margin-top: 16px; }

/* ===== 预览弹窗样式 ===== */
.preview-body { display: flex; gap: 24px; min-height: 360px; }
.preview-canvas-box {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 300px;
  min-height: 300px;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: auto;
  border: 1px solid #e9ecef;
}
.preview-canvas { image-rendering: pixelated; max-width: 500px; max-height: 500px; }
.preview-info { flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 16px; }
.preview-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
</style>
