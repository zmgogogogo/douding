<!-- ============================================
  TemplateListView.vue — 模板/作品管理列表
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
            <el-option label="已删除" :value="-2" />
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
        <el-button size="small" type="info" @click="batchReview(-2)">批量删除</el-button>
      </div>

      <el-table :data="list" v-loading="loading" @selection-change="onSelectionChange" stripe>
        <el-table-column type="selection" width="40" />
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="缩略图" width="70">
          <template #default="{ row }">
            <img v-if="row.thumbnail" :src="row.thumbnail" class="thumb-img" />
            <div v-else class="thumb-placeholder">🧩</div>
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
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" v-if="row.status !== 1" @click="review(row, 1)">通过</el-button>
            <el-button size="small" type="warning" v-if="row.status !== -1" @click="review(row, -1)">驳回</el-button>
            <el-button size="small" type="danger" @click="review(row, -2)">删除</el-button>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import adminAPI from '@/api/admin.js'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const selectedIds = ref([])

const filters = reactive({ keyword: '', status: '', isPublic: '' })

function onSelectionChange(rows) { selectedIds.value = rows.map((r) => r.id) }

async function loadData() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: page.value, limit: limit.value })
    if (filters.keyword) params.set('keyword', filters.keyword)
    if (filters.status !== '') params.set('status', filters.status)
    if (filters.isPublic !== '') params.set('isPublic', filters.isPublic)

    const res = await adminAPI.get(`/api/admin/templates?${params}`)
    list.value = res.data.list
    total.value = res.data.total
  } catch (err) {
    ElMessage.error('加载模板列表失败')
  } finally {
    loading.value = false
  }
}

function search() { page.value = 1; loadData() }
function resetFilters() { filters.keyword = ''; filters.status = ''; filters.isPublic = ''; search() }

async function review(row, status) {
  const labels = { 1: '通过', '-1': '驳回', '-2': '删除' }
  try {
    await ElMessageBox.confirm(`确认${labels[String(status)]}该作品？`, labels[String(status)], { confirmButtonText: '确认', cancelButtonText: '取消' })
    await adminAPI.put(`/api/admin/templates/${row.id}/status`, { status, comment: '' })
    ElMessage.success('操作成功')
    loadData()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.message || '操作失败')
  }
}

async function batchReview(status) {
  try {
    await ElMessageBox.confirm(`确认批量操作 ${selectedIds.value.length} 个作品？`, '批量操作', { confirmButtonText: '确认', cancelButtonText: '取消' })
    await adminAPI.post('/api/admin/templates/batch-status', { ids: selectedIds.value, status, comment: '' })
    ElMessage.success('操作成功')
    loadData()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.message || '操作失败')
  }
}

function statusTag(s) { return s === 1 ? 'success' : s === 0 ? 'warning' : s === -1 ? 'danger' : 'info' }
function statusText(s) { return s === 1 ? '已发布' : s === 0 ? '待审核' : s === -1 ? '已驳回' : '已删除' }

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
.mt-4 { margin-top: 16px; }
</style>
