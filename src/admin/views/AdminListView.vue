<!-- ============================================
  AdminListView.vue — 管理员账号管理
============================================ -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">🔐 管理员账号</h2>
      <el-button type="primary" @click="openCreate">新增管理员</el-button>
    </div>

    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="nickname" label="昵称" width="120" />
        <el-table-column prop="role_name" label="角色" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.role_name" size="small">{{ row.role_name }}</el-tag>
            <el-tag v-else type="success" size="small">超级管理员</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status ? 'success' : 'danger'" size="small">{{ row.status ? '正常' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="last_login_at" label="最后登录" width="140" />
        <el-table-column prop="created_at" label="创建时间" width="140" />
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" @click="openResetPwd(row)">重置密码</el-button>
            <el-button size="small" :type="row.status ? 'warning' : 'success'" @click="toggleStatus(row)">
              {{ row.status ? '禁用' : '启用' }}
            </el-button>
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="formTitle" width="500px">
      <el-form :model="form" label-position="top">
        <el-form-item label="用户名" required>
          <el-input v-model="form.username" :disabled="!!form.id" placeholder="管理员登录账号" />
        </el-form-item>
        <el-form-item v-if="!form.id" label="密码" required>
          <el-input v-model="form.password" type="password" placeholder="登录密码（至少6位）" show-password />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" placeholder="显示名称" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.roleId" placeholder="选择角色（空为超管）" clearable>
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="saveForm" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码弹窗 -->
    <el-dialog v-model="pwdVisible" title="重置密码" width="400px">
      <el-form-item label="新密码" required>
        <el-input v-model="newPassword" type="password" placeholder="至少6位" show-password />
      </el-form-item>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" @click="doResetPwd">确认重置</el-button>
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
const limit = ref(20)
const roles = ref([])
const formVisible = ref(false)
const pwdVisible = ref(false)
const editingAdmin = ref(null)
const newPassword = ref('')
const form = reactive({ id: null, username: '', password: '', nickname: '', roleId: null })
const formTitle = ref('')

async function loadData() {
  loading.value = true
  try {
    const res = await adminAPI.get(`/api/admin/admins?page=${page.value}&limit=${limit.value}`)
    list.value = res.data.list
    total.value = res.data.total
  } catch (err) { ElMessage.error('加载管理员列表失败') }
  finally { loading.value = false }
}

async function loadRoles() {
  try { const res = await adminAPI.get('/api/admin/roles/all'); roles.value = res.data } catch {}
}

function openCreate() {
  form.id = null; form.username = ''; form.password = ''; form.nickname = ''; form.roleId = null
  formTitle.value = '新增管理员'
  formVisible.value = true
}

function openEdit(row) {
  form.id = row.id; form.username = row.username; form.password = ''; form.nickname = row.nickname; form.roleId = row.role_id
  formTitle.value = '编辑管理员'
  formVisible.value = true
}

async function saveForm() {
  if (!form.username) return ElMessage.warning('请输入用户名')
  if (!form.id && !form.password) return ElMessage.warning('请输入密码')

  saving.value = true
  try {
    if (form.id) {
      await adminAPI.put(`/api/admin/admins/${form.id}`, { nickname: form.nickname, roleId: form.roleId })
    } else {
      await adminAPI.post('/api/admin/admins', { username: form.username, password: form.password, nickname: form.nickname, roleId: form.roleId })
    }
    ElMessage.success(form.id ? '保存成功' : '创建成功')
    formVisible.value = false
    loadData()
  } catch (err) { ElMessage.error(err.message || '操作失败') }
  finally { saving.value = false }
}

function openResetPwd(row) {
  editingAdmin.value = row
  newPassword.value = ''
  pwdVisible.value = true
}

async function doResetPwd() {
  if (!newPassword.value || newPassword.value.length < 6) return ElMessage.warning('密码至少6位')
  try {
    await adminAPI.put(`/api/admin/admins/${editingAdmin.value.id}/reset-password`, { newPassword: newPassword.value })
    ElMessage.success('密码已重置')
    pwdVisible.value = false
  } catch (err) { ElMessage.error(err.message || '操作失败') }
}

async function toggleStatus(row) {
  try {
    await adminAPI.put(`/api/admin/admins/${row.id}`, { status: row.status ? 0 : 1 })
    ElMessage.success(row.status ? '已禁用' : '已启用')
    loadData()
  } catch (err) { ElMessage.error(err.message || '操作失败') }
}

onMounted(() => { loadData(); loadRoles() })
</script>

<style scoped>
.page-container { max-width: 1200px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.pagination-box { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
