<!-- ============================================
  BannerListView.vue — Banner 管理列表
============================================ -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">📢 Banner 管理</h2>
      <el-button type="primary" @click="$router.push('/admin/banners/new')">新增 Banner</el-button>
    </div>

    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="预览" width="160">
          <template #default="{ row }">
            <div class="banner-preview" v-if="row.image_url">
              <img :src="row.image_url" />
            </div>
            <span v-else class="text-slate-400">无图片</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
        <el-table-column prop="link_type" label="链接类型" width="80" align="center" />
        <el-table-column prop="link_value" label="链接值" width="120" show-overflow-tooltip />
        <el-table-column prop="sort_order" label="排序" width="60" align="center" />
        <el-table-column label="状态" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status ? 'success' : 'info'" size="small">{{ row.status ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="排期" width="180">
          <template #default="{ row }">
            <span v-if="row.start_time || row.end_time" class="text-xs">
              {{ row.start_time || '-' }} ~ {{ row.end_time || '-' }}
            </span>
            <span v-else class="text-slate-400">不限</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="140" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="$router.push(`/admin/banners/${row.id}`)">编辑</el-button>
            <el-button size="small" :type="row.status ? 'warning' : 'success'" @click="toggleStatus(row)">
              {{ row.status ? '禁用' : '启用' }}
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
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
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import adminAPI from '@/api/admin.js'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)

async function loadData() {
  loading.value = true
  try {
    const res = await adminAPI.get(`/api/admin/banners?page=${page.value}&limit=${limit.value}`)
    list.value = res.data.list
    total.value = res.data.total
  } catch (err) {
    ElMessage.error('加载Banner列表失败')
  } finally {
    loading.value = false
  }
}

async function toggleStatus(row) {
  try {
    await adminAPI.put(`/api/admin/banners/${row.id}`, { ...row, status: row.status ? 0 : 1 })
    ElMessage.success(row.status ? '已禁用' : '已启用')
    loadData()
  } catch (err) { ElMessage.error(err.message || '操作失败') }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除 Banner「${row.title}」？`, '删除', { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' })
    await adminAPI.del(`/api/admin/banners/${row.id}`)
    ElMessage.success('已删除')
    loadData()
  } catch (err) { if (err !== 'cancel') ElMessage.error(err.message || '删除失败') }
}

onMounted(loadData)
</script>

<style scoped>
.page-container { max-width: 1400px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.pagination-box { display: flex; justify-content: flex-end; margin-top: 16px; }
.banner-preview { width: 140px; height: 40px; overflow: hidden; border-radius: 4px; }
.banner-preview img { width: 100%; height: 100%; object-fit: cover; }
</style>
