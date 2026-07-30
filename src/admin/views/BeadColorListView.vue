<!-- ============================================
  BeadColorListView.vue — 色板管理列表
============================================ -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">🎨 色号管理</h2>
    </div>

    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="5">
          <el-input v-model="filters.keyword" placeholder="搜索名称/色值" clearable @keyup.enter="search" />
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.brandId" placeholder="品牌" clearable @change="search">
            <el-option v-for="b in brands" :key="b.id" :label="b.name" :value="b.id" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.colorType" placeholder="类型" clearable @change="search">
            <el-option label="基础色" :value="1" />
            <el-option label="荧光色" :value="2" />
            <el-option label="透明色" :value="3" />
            <el-option label="金属色" :value="4" />
            <el-option label="夜光色" :value="5" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.isDiscontinued" placeholder="状态" clearable @change="search">
            <el-option label="在售" :value="0" />
            <el-option label="停产" :value="1" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="search">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="mt-4">
      <div class="batch-bar" v-if="selectedIds.length">
        <span>已选 {{ selectedIds.length }} 项</span>
        <el-button size="small" type="warning" @click="batchDiscontinued(true)">标记停产</el-button>
        <el-button size="small" type="success" @click="batchDiscontinued(false)">恢复在售</el-button>
      </div>

      <el-table :data="list" v-loading="loading" @selection-change="onSelectionChange" stripe>
        <el-table-column type="selection" width="40" />
        <el-table-column label="色块" width="60" align="center">
          <template #default="{ row }">
            <div class="color-swatch" :style="{ background: row.hex }" />
          </template>
        </el-table-column>
        <el-table-column prop="brandName" label="品牌" width="80" />
        <el-table-column prop="seriesName" label="系列" width="120" show-overflow-tooltip />
        <el-table-column prop="name" label="颜色名称" min-width="120" />
        <el-table-column prop="hex" label="色值" width="90">
          <template #default="{ row }"><code>{{ row.hex }}</code></template>
        </el-table-column>
        <el-table-column label="LAB值" width="160">
          <template #default="{ row }">
            <span class="text-xs text-slate-500" v-if="row.labL">
              L:{{ row.labL?.toFixed(1) }} a:{{ row.labA?.toFixed(1) }} b:{{ row.labB?.toFixed(1) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="70" align="center">
          <template #default="{ row }"><el-tag size="small">{{ colorTypeText(row.colorType) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="状态" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isDiscontinued ? 'danger' : 'success'" size="small">{{ row.isDiscontinued ? '停产' : '在售' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="!row.isDiscontinued" size="small" type="warning" @click="toggleDiscontinued(row, true)">停产</el-button>
            <el-button v-else size="small" type="success" @click="toggleDiscontinued(row, false)">恢复</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-box">
        <el-pagination
          v-model:current-page="page" v-model:page-size="limit"
          :total="total" :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next" @change="loadData"
        />
      </div>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" title="编辑色号" width="500px">
      <el-form :model="editForm" label-position="top">
        <el-form-item label="颜色名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="色值">
          <el-color-picker v-model="editForm.hex" show-alpha />
          <el-input v-model="editForm.hex" class="mt-2" />
        </el-form-item>
        <el-form-item label="LAB 值">L: {{ editForm.labL?.toFixed(1) }} A: {{ editForm.labA?.toFixed(1) }} B: {{ editForm.labB?.toFixed(1) }}</el-form-item>
        <el-form-item label="热门色号">
          <el-switch v-model="editForm.isHot" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import adminAPI from '@/api/admin.js'

const loading = ref(false)
const saving = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(50)
const selectedIds = ref([])
const brands = ref([])
const editVisible = ref(false)
const editForm = reactive({ id: null, name: '', hex: '', labL: null, labA: null, labB: null, isHot: false })

const filters = reactive({ keyword: '', brandId: '', colorType: '', isDiscontinued: '' })

function onSelectionChange(rows) { selectedIds.value = rows.map((r) => r.id) }

async function loadBrands() {
  try { const res = await adminAPI.get('/api/admin/bead-colors/brands/list'); brands.value = res.data } catch {}
}

async function loadData() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: page.value, limit: limit.value })
    if (filters.keyword) params.set('keyword', filters.keyword)
    if (filters.brandId) params.set('brandId', filters.brandId)
    if (filters.colorType) params.set('colorType', filters.colorType)
    if (filters.isDiscontinued !== '') params.set('isDiscontinued', filters.isDiscontinued)

    const res = await adminAPI.get(`/api/admin/bead-colors?${params}`)
    list.value = res.data.list
    total.value = res.data.total
  } catch (err) {
    ElMessage.error('加载色号列表失败')
  } finally {
    loading.value = false
  }
}

function search() { page.value = 1; loadData() }
function resetFilters() { filters.keyword = ''; filters.brandId = ''; filters.colorType = ''; filters.isDiscontinued = ''; search() }

async function toggleDiscontinued(row, discontinued) {
  try {
    await ElMessageBox.confirm(`确认标记为${discontinued ? '停产' : '在售'}？`, discontinued ? '停产' : '恢复', { confirmButtonText: '确认', cancelButtonText: '取消' })
    await adminAPI.post('/api/admin/bead-colors/batch-status', { ids: [row.id], isDiscontinued: discontinued })
    ElMessage.success('操作成功')
    loadData()
  } catch (err) { if (err !== 'cancel') ElMessage.error(err.message || '操作失败') }
}

async function batchDiscontinued(discontinued) {
  try {
    await ElMessageBox.confirm(`确认批量标记${selectedIds.value.length}个色号为${discontinued ? '停产' : '在售'}？`, '批量操作', { confirmButtonText: '确认', cancelButtonText: '取消' })
    await adminAPI.post('/api/admin/bead-colors/batch-status', { ids: selectedIds.value, isDiscontinued: discontinued })
    ElMessage.success('操作成功')
    loadData()
  } catch (err) { if (err !== 'cancel') ElMessage.error(err.message || '操作失败') }
}

function openEdit(row) {
  editForm.id = row.id
  editForm.name = row.name
  editForm.hex = row.hex
  editForm.labL = row.labL
  editForm.labA = row.labA
  editForm.labB = row.labB
  editForm.isHot = !!row.isHot
  editVisible.value = true
}

async function saveEdit() {
  saving.value = true
  try {
    await adminAPI.put(`/api/admin/bead-colors/${editForm.id}`, editForm)
    ElMessage.success('保存成功')
    editVisible.value = false
    loadData()
  } catch (err) { ElMessage.error(err.message || '保存失败') }
  finally { saving.value = false }
}

function colorTypeText(t) {
  const map = { 1: '基础', 2: '荧光', 3: '透明', 4: '金属', 5: '夜光', 6: '哑光' }
  return map[t] || '未知'
}

onMounted(() => { loadBrands(); loadData() })
</script>

<style scoped>
.page-container { max-width: 1400px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.filter-card { border-radius: 12px; }
.pagination-box { display: flex; justify-content: flex-end; margin-top: 16px; }
.batch-bar { display: flex; align-items: center; gap: 8px; padding: 8px 0; margin-bottom: 8px; border-bottom: 1px solid #ebeef5; }
.color-swatch { width: 32px; height: 32px; border-radius: 4px; border: 1px solid #ddd; display: inline-block; }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
</style>
