<!-- ============================================
  LogListView.vue — 操作日志列表
============================================ -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">📋 操作日志</h2>
    </div>

    <!-- 筛选区 -->
    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="4">
          <el-select v-model="filters.module" placeholder="操作模块" clearable @change="search">
            <el-option label="认证" value="认证" />
            <el-option label="用户管理" value="用户管理" />
            <el-option label="内容管理" value="内容管理" />
            <el-option label="色板管理" value="色板管理" />
            <el-option label="运营管理" value="运营管理" />
            <el-option label="权限管理" value="权限管理" />
          </el-select>
        </el-col>
        <el-col :span="3">
          <el-input v-model="filters.keyword" placeholder="搜索" clearable @keyup.enter="search" />
        </el-col>
        <el-col :span="4">
          <el-date-picker
            v-model="filters.dateRange" type="daterange"
            range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期"
            value-format="YYYY-MM-DD" @change="search"
          />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="search">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 统计概览 -->
    <el-row :gutter="12" class="mt-4" v-if="stats">
      <el-col :span="6">
        <el-card shadow="hover" class="mini-stat">
          <div class="mini-label">总操作量</div>
          <div class="mini-value">{{ stats.totalCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="mini-stat">
          <div class="mini-label">今日操作</div>
          <div class="mini-value">{{ stats.todayCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="mini-stat">
          <div class="mini-label">本月操作</div>
          <div class="mini-value">{{ stats.monthCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="mini-stat">
          <div class="mini-label">失败率</div>
          <div class="mini-value" :class="{ 'text-danger': parseFloat(stats.failureRate) > 5 }">{{ stats.failureRate }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 日志表格 -->
    <el-card class="mt-4">
      <el-table :data="list" v-loading="loading" stripe size="small">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="log-detail">
              <p><strong>操作详情:</strong> {{ row.detail || '无' }}</p>
              <p><strong>目标类型:</strong> {{ row.target_type || '-' }}</p>
              <p><strong>目标ID:</strong> {{ row.target_id || '-' }}</p>
              <p><strong>IP:</strong> {{ row.ip || '-' }}</p>
              <p><strong>UA:</strong> {{ row.user_agent || '-' }}</p>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="admin_name" label="操作人" width="100" />
        <el-table-column prop="module" label="模块" width="90" />
        <el-table-column prop="action" label="操作" width="80" />
        <el-table-column prop="target_type" label="目标" width="80" />
        <el-table-column prop="target_id" label="目标ID" width="70" align="center" />
        <el-table-column label="结果" width="60" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status ? 'success' : 'danger'" size="small">{{ row.status ? '成功' : '失败' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="duration_ms" label="耗时" width="70" align="center">
          <template #default="{ row }">{{ row.duration_ms }}ms</template>
        </el-table-column>
        <el-table-column prop="created_at" label="操作时间" width="150" />
      </el-table>

      <div class="pagination-box">
        <el-pagination
          v-model:current-page="page" v-model:page-size="limit"
          :total="total" :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next" @change="loadData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import adminAPI from '@/api/admin.js'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const stats = ref(null)

const filters = reactive({ module: '', keyword: '', dateRange: null })

async function loadData() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: page.value, limit: limit.value })
    if (filters.module) params.set('module', filters.module)
    if (filters.keyword) params.set('keyword', filters.keyword)
    if (filters.dateRange) {
      params.set('startDate', filters.dateRange[0])
      params.set('endDate', filters.dateRange[1])
    }

    const res = await adminAPI.get(`/api/admin/logs?${params}`)
    list.value = res.data.list
    total.value = res.data.total
  } catch (err) { ElMessage.error('加载日志失败') }
  finally { loading.value = false }
}

async function loadStats() {
  try { const res = await adminAPI.get('/api/admin/logs/stats/summary'); stats.value = res.data } catch {}
}

function search() { page.value = 1; loadData() }
function resetFilters() { filters.module = ''; filters.keyword = ''; filters.dateRange = null; search() }

onMounted(() => { loadData(); loadStats() })
</script>

<style scoped>
.page-container { max-width: 1400px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.filter-card { border-radius: 12px; }
.pagination-box { display: flex; justify-content: flex-end; margin-top: 16px; }
.mini-stat { border-radius: 12px; text-align: center; }
.mini-label { font-size: 13px; color: #999; }
.mini-value { font-size: 24px; font-weight: 700; color: #1a1a1a; margin-top: 4px; }
.text-danger { color: #f56c6c; }
.log-detail { padding: 8px 16px; font-size: 13px; color: #666; }
.log-detail p { margin: 4px 0; }
.mt-4 { margin-top: 16px; }
</style>
