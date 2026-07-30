<!-- ============================================
  UserListView.vue — 用户管理列表
============================================ -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">👤 用户管理</h2>
    </div>

    <!-- 筛选区 -->
    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="6">
          <el-input v-model="filters.keyword" placeholder="搜索用户ID/昵称/用户名" clearable @clear="search" @keyup.enter="search" />
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.status" placeholder="用户状态" clearable @change="search">
            <el-option label="正常" :value="1" />
            <el-option label="封禁" :value="0" />
            <el-option label="注销" :value="-1" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="search">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 表格 -->
    <el-card class="mt-4">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="用户ID" width="80" />
        <el-table-column label="头像" width="60">
          <template #default="{ row }">
            <el-avatar :size="32" :src="row.avatar" />
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="username" label="用户名" min-width="100" show-overflow-tooltip />
        <el-table-column label="会员" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isVip" type="warning" size="small">VIP</el-tag>
            <span v-else class="text-slate-400">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="designCount" label="作品数" width="80" align="center" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="$router.push(`/admin/users/${row.id}`)">详情</el-button>
            <el-button v-if="row.status === 1" size="small" type="danger" @click="toggleBan(row, 0)">封禁</el-button>
            <el-button v-if="row.status === 0" size="small" type="success" @click="toggleBan(row, 1)">解封</el-button>
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

const filters = reactive({ keyword: '', status: '' })

async function loadData() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: page.value, limit: limit.value })
    if (filters.keyword) params.set('keyword', filters.keyword)
    if (filters.status !== '') params.set('status', filters.status)

    const res = await adminAPI.get(`/api/admin/users?${params}`)
    list.value = res.data.list
    total.value = res.data.total
  } catch (err) {
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  loadData()
}

function resetFilters() {
  filters.keyword = ''
  filters.status = ''
  search()
}

async function toggleBan(user, newStatus) {
  const action = newStatus === 0 ? '封禁' : '解封'
  try {
    const { value: reason } = await ElMessageBox.prompt(
      newStatus === 0 ? '请输入封禁原因' : '确认解封该用户？',
      `${action}用户: ${user.nickname || user.username}`,
      { confirmButtonText: '确认', cancelButtonText: '取消', inputPlaceholder: '封禁原因（选填）' }
    ).catch(() => null)
    if (reason === null && newStatus === 0) return

    await adminAPI.put(`/api/admin/users/${user.id}/status`, { status: newStatus, reason: reason || '' })
    ElMessage.success(`${action}成功`)
    loadData()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.message || `${action}失败`)
  }
}

function statusTag(s) {
  if (s === 1) return 'success'
  if (s === 0) return 'danger'
  return 'info'
}
function statusText(s) {
  if (s === 1) return '正常'
  if (s === 0) return '封禁'
  return '注销'
}

onMounted(loadData)
</script>

<style scoped>
.page-container { max-width: 1400px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.filter-card { border-radius: 12px; }
.pagination-box { display: flex; justify-content: flex-end; margin-top: 16px; }
.mt-4 { margin-top: 16px; }
</style>
