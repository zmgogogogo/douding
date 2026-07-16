<!-- ============================================
  AuthView.vue — 登录 / 注册
============================================ -->
<template>
  <div class="flex items-center justify-center h-full p-5 bg-gradient-to-br from-blue-50/60 via-slate-50 to-blue-50/40">
    <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-[380px]">
      <h2 class="text-[22px] font-extrabold mb-1 text-center">{{ isLogin ? '👋 欢迎回来' : '✨ 创建账号' }}</h2>
      <p class="text-[13px] text-slate-500 text-center mb-6">
        {{ isLogin ? '登录你的豆丁账号' : '注册成为豆丁用户' }}
      </p>

      <div class="space-y-3.5">
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">用户名</label>
          <input v-model="username" type="text" placeholder="输入用户名"
            class="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm
                   focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">密码</label>
          <input v-model="password" type="password" :placeholder="isLogin ? '输入密码' : '至少6位密码'"
            class="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm
                   focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
            @keyup.enter="handleSubmit" />
        </div>
        <div v-if="!isLogin">
          <label class="block text-xs font-semibold text-slate-500 mb-1">昵称</label>
          <input v-model="nickname" type="text" placeholder="给自己起个名字"
            class="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm
                   focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
            @keyup.enter="handleSubmit" />
        </div>
      </div>

      <button class="w-full mt-5 h-11 rounded-full bg-primary text-white font-semibold text-sm
                     hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25 transition-all duration-150 active:scale-[0.98]"
        @click="handleSubmit" :disabled="submitting">
        {{ submitting ? '处理中...' : (isLogin ? '登录' : '注册') }}
      </button>

      <p class="text-center mt-4 text-xs text-slate-500">
        {{ isLogin ? '还没有账号？' : '已有账号？' }}
        <a class="text-primary font-semibold cursor-pointer" @click="toggleMode">{{ isLogin ? '立即注册' : '去登录' }}</a>
      </p>
      <p class="text-center mt-1 text-xs text-slate-400">
        <a class="cursor-pointer hover:text-slate-600" @click="$router.push('/')">跳过，先看看</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'

const router = useRouter()
const auth = useAuth()
const toast = useToast()

const isLogin = ref(true)
const username = ref('')
const password = ref('')
const nickname = ref('')
const submitting = ref(false)

function toggleMode() {
  isLogin.value = !isLogin.value
  password.value = ''
}

async function handleSubmit() {
  if (!username.value.trim() || !password.value) {
    return toast.show('请填写用户名和密码')
  }
  submitting.value = true
  try {
    const endpoint = isLogin.value ? '/api/auth/login' : '/api/auth/register'
    const body = { username: username.value.trim(), password: password.value }
    if (!isLogin.value) body.nickname = nickname.value.trim() || username.value.trim()
    const res = await API.post(endpoint, body, false)
    auth.setAuth(res.data.token, res.data.user)
    toast.show(isLogin.value ? '登录成功！' : '注册成功！')
    router.push('/')
  } catch (e) {
    toast.show(e.message)
  } finally {
    submitting.value = false
  }
}
</script>
