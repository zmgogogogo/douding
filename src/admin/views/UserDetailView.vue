<!-- ============================================
  UserDetailView.vue — 用户详情页
============================================ -->
<template>
  <div class="page-container">
    <div class="page-header">
      <el-button text @click="$router.back()"><el-icon><ArrowLeft /></el-icon> 返回列表</el-button>
    </div>

    <el-card v-loading="loading" class="detail-card">
      <template v-if="user">
        <!-- 基础信息 -->
        <div class="user-header">
          <el-avatar :size="64" :src="user.avatar" />
          <div class="user-info">
            <h3>{{ user.nickname || user.username }}</h3>
            <p class="text-slate-500">@{{ user.username }} · ID: {{ user.id }}</p>
            <p>
              <el-tag :type="user.isVip ? 'warning' : 'info'" size="small">{{ user.isVip ? 'VIP会员' : '普通用户' }}</el-tag>
              <el-tag :type="statusTag(user.status)" size="small" class="ml-2">{{ statusText(user.status) }}</el-tag>
            </p>
          </div>
        </div>

        <!-- 标签页 -->
        <el-tabs v-model="activeTab" class="mt-4">
          <el-tab-pane label="基本信息" name="info">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="用户ID">{{ user.id }}</el-descriptions-item>
              <el-descriptions-item label="用户名">{{ user.username }}</el-descriptions-item>
              <el-descriptions-item label="昵称">{{ user.nickname }}</el-descriptions-item>
              <el-descriptions-item label="个人简介">{{ user.bio || '-' }}</el-descriptions-item>
              <el-descriptions-item label="会员状态">{{ user.isVip ? 'VIP' : '普通用户' }}</el-descriptions-item>
              <el-descriptions-item label="到期时间">{{ user.vipExpireAt || '-' }}</el-descriptions-item>
              <el-descriptions-item label="作品数">{{ user.designCount }}</el-descriptions-item>
              <el-descriptions-item label="库存颜色数">{{ user.inventoryCount }}</el-descriptions-item>
              <el-descriptions-item label="点赞数">{{ user.likeCount }}</el-descriptions-item>
              <el-descriptions-item label="注册时间">{{ user.createdAt }}</el-descriptions-item>
              <el-descriptions-item label="封禁原因" v-if="user.status === 0">{{ user.banReason || '-' }}</el-descriptions-item>
            </el-descriptions>

            <div class="mt-4">
              <el-button @click="showEdit = true">编辑资料</el-button>
              <el-button v-if="user.status === 1" type="danger" @click="handleBan">封禁用户</el-button>
              <el-button v-if="user.status === 0" type="success" @click="handleUnban">解封用户</el-button>
            </div>
          </el-tab-pane>

          <el-tab-pane label="作品列表" name="designs">
            <el-table :data="user.recentDesigns || []" size="small">
              <el-table-column prop="id" label="ID" width="60" />
              <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
              <el-table-column label="公开" width="60" align="center">
                <template #default="{ row }"><el-tag :type="row.is_public ? 'success' : 'info'" size="small">{{ row.is_public ? '是' : '否' }}</el-tag></template>
              </el-table-column>
              <el-table-column prop="likes_count" label="点赞" width="60" align="center" />
              <el-table-column prop="views_count" label="浏览" width="60" align="center" />
              <el-table-column prop="created_at" label="创建时间" width="160" />
            </el-table>
            <div v-if="!user.recentDesigns?.length" class="text-center text-slate-400 py-8">暂无作品</div>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="showEdit" title="编辑用户资料" width="500px">
      <el-form :model="editForm" label-position="top">
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" />
        </el-form-item>
        <el-form-item label="个人简介">
          <el-input v-model="editForm.bio" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="VIP状态">
          <el-switch v-model="editForm.isVip" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import adminAPI from '@/api/admin.js'

const route = useRoute()
const loading = ref(false)
const user = ref(null)
const activeTab = ref('info')
const showEdit = ref(false)
const editForm = reactive({ nickname: '', bio: '', isVip: false })

async function loadUser() {
  loading.value = true
  try {
    const res = await adminAPI.get(`/api/admin/users/${route.params.id}`)
    user.value = res.data
    editForm.nickname = res.data.nickname || ''
    editForm.bio = res.data.bio || ''
    editForm.isVip = res.data.isVip
  } catch (err) {
    ElMessage.error('加载用户详情失败')
  } finally {
    loading.value = false
  }
}

async function saveEdit() {
  try {
    await adminAPI.put(`/api/admin/users/${user.value.id}`, editForm)
    ElMessage.success('保存成功')
    showEdit.value = false
    loadUser()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  }
}

async function handleBan() {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入封禁原因', '封禁用户', {
      confirmButtonText: '确认封禁', cancelButtonText: '取消',
      inputPlaceholder: '封禁原因（必填）',
    }).catch(() => null)
    if (!reason) return

    await adminAPI.put(`/api/admin/users/${user.value.id}/status`, { status: 0, reason })
    ElMessage.success('已封禁')
    loadUser()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.message || '操作失败')
  }
}

async function handleUnban() {
  try {
    await ElMessageBox.confirm('确认解封该用户？', '解封', { confirmButtonText: '确认', cancelButtonText: '取消' })
    await adminAPI.put(`/api/admin/users/${user.value.id}/status`, { status: 1, reason: '' })
    ElMessage.success('已解封')
    loadUser()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.message || '操作失败')
  }
}

function statusTag(s) { return s === 1 ? 'success' : s === 0 ? 'danger' : 'info' }
function statusText(s) { return s === 1 ? '正常' : s === 0 ? '封禁' : '注销' }

onMounted(loadUser)
</script>

<style scoped>
.page-container { max-width: 1200px; }
.page-header { margin-bottom: 16px; }
.detail-card { border-radius: 12px; }
.user-header { display: flex; align-items: center; gap: 16px; }
.user-header h3 { margin: 0; font-size: 20px; }
.mt-4 { margin-top: 16px; }
.ml-2 { margin-left: 8px; }
</style>
