<!-- ============================================
  LoginView.vue — 管理员登录页
  独立页面，不套用 AdminLayout
============================================ -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-100">
    <div class="w-full max-w-md">
      <!-- Logo 区 -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-slate-800">🧩 豆丁管理后台</h1>
        <p class="text-slate-500 mt-2">拼豆平台运营管理中心</p>
      </div>

      <!-- 登录卡片 -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h2 class="text-lg font-semibold text-slate-700 mb-6">管理员登录</h2>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="handleLogin">
          <el-form-item label="账号" prop="username">
            <el-input
              v-model="form.username"
              placeholder="请输入管理员账号"
              :prefix-icon="User"
              size="large"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              size="large"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              class="w-full"
              :loading="loading"
              @click="handleLogin"
            >
              {{ loading ? '登录中...' : '登 录' }}
            </el-button>
          </el-form-item>
        </el-form>

        <p v-if="errorMsg" class="text-red-500 text-sm text-center">{{ errorMsg }}</p>
      </div>

      <p class="text-center text-slate-400 text-xs mt-6">
        仅限授权管理员访问 · 操作全留痕
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import adminAPI from '@/api/admin.js'
import { useAdminAuth } from '../composables/useAdminAuth.js'

const router = useRouter()
const route = useRoute()
const { setAuth } = useAdminAuth()

const formRef = ref(null)
const loading = ref(false)
const errorMsg = ref('')

const form = reactive({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入管理员账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  errorMsg.value = ''

  try {
    const res = await adminAPI.post('/api/admin/auth/login', {
      username: form.username,
      password: form.password,
    })
    setAuth(res.data.token, res.data.admin)

    // 跳转到登录前页面或默认看板
    const redirect = route.query.redirect || '/admin/dashboard'
    router.push(redirect)
  } catch (err) {
    errorMsg.value = err.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>
