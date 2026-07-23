<!-- ============================================
  AuthView.vue — 登录 / 注册（用户名 + 手机号双模式）
  ============================================ -->
<template>
  <div
    class="flex items-center justify-center h-full p-5 bg-gradient-to-br from-blue-50/60 via-slate-50 to-blue-50/40"
  >
    <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-[380px]">
      <h2 class="text-[22px] font-extrabold mb-1 text-center">
        {{ isLogin ? '👋 欢迎回来' : '✨ 创建账号' }}
      </h2>
      <p class="text-[13px] text-slate-500 text-center mb-5">
        {{ isLogin ? '登录你的豆丁账号' : '注册成为豆丁用户' }}
      </p>

      <!-- 登录方式 -->
      <div class="flex bg-slate-100 rounded-xl p-1 mb-4">
        <button
          class="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
          :class="mode === 'user' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'"
          @click="mode = 'user'"
        >
          用户名
        </button>
        <button
          class="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
          :class="mode === 'phone' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'"
          @click="mode = 'phone'"
        >
          手机号
        </button>
      </div>

      <div class="space-y-3">
        <!-- 用户名模式 -->
        <template v-if="mode === 'user'">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">用户名</label>
            <input
              v-model="username"
              type="text"
              placeholder="输入用户名"
              maxlength="20"
              class="auth-input"
            />
          </div>
          <div v-if="!isLogin">
            <label class="block text-xs font-semibold text-slate-500 mb-1">昵称（可选）</label>
            <input
              v-model="nickname"
              type="text"
              placeholder="给自己取个名字"
              maxlength="20"
              class="auth-input"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">密码</label>
            <input
              v-model="password"
              type="password"
              :placeholder="isLogin ? '输入密码' : '至少6位密码'"
              class="auth-input"
              @keyup.enter="handleSubmit"
            />
          </div>
        </template>

        <!-- 手机号模式 -->
        <template v-else>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">手机号</label>
            <input
              v-model="phone"
              type="tel"
              placeholder="输入11位手机号"
              maxlength="11"
              class="auth-input"
            />
          </div>
          <div v-if="!isLogin">
            <label class="block text-xs font-semibold text-slate-500 mb-1">昵称</label>
            <input
              v-model="nickname"
              type="text"
              placeholder="给自己取个名字"
              maxlength="20"
              class="auth-input"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">验证码</label>
            <div class="flex gap-2">
              <input
                v-model="code"
                type="text"
                placeholder="6位验证码"
                maxlength="6"
                class="auth-input flex-1"
              />
              <button
                class="h-10 px-3 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-dark disabled:opacity-50 transition-colors flex-shrink-0"
                :disabled="codeSending"
                @click="sendCode"
              >
                {{ codeBtnText }}
              </button>
            </div>
          </div>
        </template>

        <button
          class="w-full h-10 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-50"
          :disabled="submitting"
          @click="handleSubmit"
        >
          {{ submitting ? '处理中...' : isLogin ? '登录' : '注册' }}
        </button>
      </div>

      <p class="text-center mt-4 text-xs text-slate-400">
        {{ isLogin ? '还没有账号？' : '已有账号？' }}
        <button
          class="text-primary font-semibold hover:underline"
          @click="
            isLogin = !isLogin
            password = ''
            code = ''
          "
        >
          {{ isLogin ? '注册新账号' : '去登录' }}
        </button>
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
const mode = ref('user')
const username = ref('')
const password = ref('')
const phone = ref('')
const code = ref('')
const nickname = ref('')
const submitting = ref(false)
const codeSending = ref(false)
const codeBtnText = ref('获取验证码')

function sendCode() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) return toast.show('请输入正确的手机号')
  codeSending.value = true
  codeBtnText.value = '已发送'
  // 演示模式：生成固定验证码（生产环境需接入真实短信服务）
  const DEMO_CODE = '123456'
  toast.show(`📱 演示模式 — 验证码：${DEMO_CODE}`)
  let countdown = 60
  const timer = setInterval(() => {
    countdown--
    codeBtnText.value = `${countdown}s`
    if (countdown <= 0) {
      clearInterval(timer)
      codeSending.value = false
      codeBtnText.value = '重新获取'
    }
  }, 1000)
}

async function handleSubmit() {
  submitting.value = true
  try {
    let endpoint, body
    if (isLogin.value) {
      endpoint = '/api/auth/login'
      body =
        mode.value === 'phone'
          ? { phone: phone.value.trim(), code: code.value }
          : { username: username.value.trim(), password: password.value }
    } else {
      endpoint = '/api/auth/register'
      body =
        mode.value === 'phone'
          ? {
              phone: phone.value.trim(),
              code: code.value,
              nickname: nickname.value.trim() || '豆友',
            }
          : {
              username: username.value.trim(),
              password: password.value,
              nickname: nickname.value.trim() || username.value.trim(),
            }
    }
    const res = await API.post(endpoint, body, false)
    auth.setAuth(res.data.token, res.data.user)
    toast.show(isLogin.value ? '登录成功！' : '注册成功！')
    router.push('/')
  } catch (e) {
    toast.show(e.message)
  }
  submitting.value = false
}
</script>

<style scoped>
.auth-input {
  @apply w-full h-10 border border-slate-200 rounded-lg px-3 text-sm
         focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors outline-none;
}
</style>
