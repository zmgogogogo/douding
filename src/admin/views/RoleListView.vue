<!-- ============================================
  RoleListView.vue — 角色管理（含权限配置）
============================================ -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">🔐 角色管理</h2>
      <el-button type="primary" @click="openCreate">新增角色</el-button>
    </div>

    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="角色名称" width="140" />
        <el-table-column prop="slug" label="标识" width="140" />
        <el-table-column prop="description" label="描述" min-width="160" show-overflow-tooltip />
        <el-table-column prop="admin_count" label="管理员数" width="80" align="center" />
        <el-table-column label="权限数" width="80" align="center">
          <template #default="{ row }">{{ (row.permissions || []).length }}</template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="140" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)" :disabled="row.admin_count > 0">删除</el-button>
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
    <el-dialog v-model="formVisible" :title="formTitle" width="600px">
      <el-form :model="form" label-position="top">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="角色名称" required>
              <el-input v-model="form.name" placeholder="如：内容审核员" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色标识" required>
              <el-input v-model="form.slug" placeholder="如：content_reviewer" :disabled="!!form.id" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="权限配置">
          <el-tree
            ref="treeRef"
            :data="permissionTree"
            show-checkbox
            node-key="key"
            :default-checked-keys="form.permissions"
            :props="{ label: 'label', children: 'children' }"
            default-expand-all
            @check="onTreeCheck"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="saveForm" :loading="saving">保存</el-button>
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
const formVisible = ref(false)
const treeRef = ref(null)
const permissionTree = ref([])
const form = reactive({ id: null, name: '', slug: '', description: '', permissions: [] })
const formTitle = ref('')

async function loadData() {
  loading.value = true
  try {
    const res = await adminAPI.get(`/api/admin/roles?page=${page.value}&limit=${limit.value}`)
    list.value = res.data.list
    total.value = res.data.total
  } catch (err) { ElMessage.error('加载角色列表失败') }
  finally { loading.value = false }
}

async function loadPermissionTree() {
  try { const res = await adminAPI.get('/api/admin/roles/permissions-tree'); permissionTree.value = res.data } catch {}
}

function openCreate() {
  form.id = null; form.name = ''; form.slug = ''; form.description = ''; form.permissions = []
  formTitle.value = '新增角色'
  formVisible.value = true
}

function openEdit(row) {
  form.id = row.id; form.name = row.name; form.slug = row.slug; form.description = row.description
  form.permissions = row.permissions || []
  formTitle.value = '编辑角色'
  formVisible.value = true
}

function onTreeCheck() {
  form.permissions = treeRef.value?.getCheckedKeys() || []
}

async function saveForm() {
  if (!form.name || !form.slug) return ElMessage.warning('请填写角色名称和标识')
  saving.value = true
  try {
    // 先获取树选中的叶子节点
    if (treeRef.value) {
      form.permissions = treeRef.value.getCheckedKeys() || []
    }

    if (form.id) {
      await adminAPI.put(`/api/admin/roles/${form.id}`, { name: form.name, description: form.description, permissions: form.permissions })
    } else {
      await adminAPI.post('/api/admin/roles', { name: form.name, slug: form.slug, description: form.description, permissions: form.permissions })
    }
    ElMessage.success(form.id ? '保存成功' : '创建成功')
    formVisible.value = false
    loadData()
  } catch (err) { ElMessage.error(err.message || '操作失败') }
  finally { saving.value = false }
}

async function handleDelete(row) {
  if (row.admin_count > 0) return ElMessage.warning('该角色下还有管理员，无法删除')
  try {
    await ElMessageBox.confirm(`确认删除角色「${row.name}」？`, '删除', { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' })
    await adminAPI.del(`/api/admin/roles/${row.id}`)
    ElMessage.success('已删除')
    loadData()
  } catch (err) { if (err !== 'cancel') ElMessage.error(err.message || '删除失败') }
}

onMounted(() => { loadData(); loadPermissionTree() })
</script>

<style scoped>
.page-container { max-width: 1200px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.pagination-box { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
