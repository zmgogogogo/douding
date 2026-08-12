<!-- ============================================
  AuthView.vue — 登录 / 注册
  登录：用户名+密码 或 手机号+验证码
  注册：手机号+验证码+密码+确认密码+协议
============================================ -->
<template>
  <div class="auth-bg">
    <div class="auth-card">
      <!-- Logo -->
      <div class="text-center mb-5">
        <div class="text-4xl mb-2">🧩</div>
        <h2 class="text-[22px] font-extrabold">
          {{ isLogin ? '👋 欢迎回来' : '创建你的拼豆账号' }}
        </h2>
        <p class="text-[13px] text-slate-400 mt-1">
          {{ isLogin ? '登录你的豆丁账号' : '用手机号注册，开启拼豆之旅' }}
        </p>
      </div>

      <!-- ========== 登录 ========== -->
      <template v-if="isLogin && !isResetPwd">
        <div class="field">
          <label>手机号</label>
          <div class="flex gap-2">
            <span class="phone-prefix">🇨🇳 +86</span>
            <input v-model="phone" type="tel" placeholder="输入手机号" maxlength="11" class="input flex-1" />
          </div>
        </div>
        <div class="field">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="输入密码" class="input" @keyup.enter="handleSubmit" />
        </div>

        <button class="submit-btn" :disabled="submitting" @click="handleSubmit">
          {{ submitting ? '处理中...' : '登录' }}
        </button>

        <p class="text-right mt-2">
          <button class="text-xs text-slate-400 hover:text-primary" @click="isResetPwd = true; phone = ''; password = ''; code = ''">忘记密码？</button>
        </p>
      </template>

      <!-- ========== 忘记密码 ========== -->
      <template v-else-if="isResetPwd">
        <div class="text-center mb-4">
          <h3 class="text-lg font-bold">🔑 重置密码</h3>
        </div>
        <div class="field" :class="{ error: phoneError }">
          <label>手机号</label>
          <div class="flex gap-2">
            <span class="phone-prefix">🇨🇳 +86</span>
            <input v-model="phone" type="tel" placeholder="输入注册手机号" maxlength="11" class="input flex-1" @input="phoneError = false" />
          </div>
        </div>
        <div class="field">
          <label>验证码</label>
          <div class="flex gap-2">
            <input v-model="code" type="text" placeholder="6位验证码" maxlength="6" class="input flex-1" />
            <button class="code-btn" :disabled="codeSending" @click="sendCode">{{ codeBtnText }}</button>
          </div>
        </div>
        <div class="field">
          <label>新密码</label>
          <div class="input-wrap">
            <input v-model="password" :type="showPw ? 'text' : 'password'" placeholder="至少6位" class="input" />
            <button class="toggle-pw" @click="showPw = !showPw">{{ showPw ? '🙈' : '👁' }}</button>
          </div>
        </div>
        <div class="field" :class="{ error: confirmError }">
          <label>确认新密码</label>
          <div class="input-wrap">
            <input v-model="confirmPw" :type="showConfirmPw ? 'text' : 'password'" placeholder="再次输入" class="input" />
            <button class="toggle-pw" @click="showConfirmPw = !showConfirmPw">{{ showConfirmPw ? '🙈' : '👁' }}</button>
          </div>
          <p v-if="confirmError" class="error-msg">两次密码不一致</p>
        </div>

        <button class="submit-btn" :disabled="submitting" @click="handleResetPwd">
          {{ submitting ? '处理中...' : '确认重置' }}
        </button>

        <p class="text-center mt-3">
          <button class="text-xs text-slate-400 hover:text-primary" @click="isResetPwd = false; phone = ''; password = ''; code = ''; confirmPw = ''">← 返回登录</button>
        </p>
      </template>

      <!-- ========== 注册 ========== -->
      <template v-else>
        <!-- 手机号 -->
        <div class="field" :class="{ error: phoneError }">
          <label>手机号</label>
          <div class="flex gap-2">
            <span class="phone-prefix">🇨🇳 +86</span>
            <input v-model="phone" type="tel" placeholder="输入手机号" maxlength="11" class="input flex-1"
              @input="phoneError = false" />
          </div>
          <p v-if="phoneError" class="error-msg">请输入正确的手机号</p>
        </div>

        <!-- 验证码 -->
        <div class="field" :class="{ error: codeError }">
          <label>验证码</label>
          <div class="flex gap-2">
            <input v-model="code" type="text" placeholder="6位验证码" maxlength="6" class="input flex-1"
              @input="codeError = false" />
            <button class="code-btn" :disabled="codeSending" @click="sendCode">{{ codeBtnText }}</button>
          </div>
          <p v-if="codeError" class="error-msg">验证码错误或已过期</p>
        </div>

        <!-- 设置密码 -->
        <div class="field" :class="{ error: pwError }">
          <label>设置密码</label>
          <div class="input-wrap">
            <input v-model="password" :type="showPw ? 'text' : 'password'" placeholder="至少6位密码" class="input"
              @input="pwError = false" />
            <button class="toggle-pw" @click="showPw = !showPw">{{ showPw ? '🙈' : '👁' }}</button>
          </div>
          <p v-if="pwError" class="error-msg">密码至少需要6位</p>
        </div>

        <!-- 确认密码 -->
        <div class="field" :class="{ error: confirmError, success: confirmOk }">
          <label>确认密码</label>
          <div class="input-wrap">
            <input v-model="confirmPw" :type="showConfirmPw ? 'text' : 'password'" placeholder="再次输入密码"
              class="input" @input="confirmError = false" />
            <button class="toggle-pw" @click="showConfirmPw = !showConfirmPw">{{ showConfirmPw ? '🙈' : '👁' }}</button>
          </div>
          <p v-if="confirmError" class="error-msg">{{ confirmPw ? '两次密码不一致' : '请确认密码' }}</p>
          <p v-if="confirmOk" class="success-msg">✓ 密码一致</p>
        </div>

        <!-- 昵称 -->
        <div class="field">
          <label>昵称（可选）</label>
          <input v-model="nickname" type="text" placeholder="给自己取个名字" maxlength="20" class="input" />
        </div>

        <!-- 协议 -->
        <div class="field">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="agreed" class="checkbox" />
            <span class="text-xs text-slate-500">
              已阅读并同意
              <a class="text-primary" @click.stop="showAgreement = true">《用户协议》</a>
              <a class="text-primary" @click.stop="showPrivacy = true">《隐私政策》</a>
            </span>
          </label>
        </div>

        <!-- 注册按钮 -->
        <button class="submit-btn" :disabled="!canRegister || submitting" @click="handleSubmit">
          {{ submitting ? '处理中...' : '注册' }}
        </button>
      </template>

      <!-- 切换登录/注册 -->
      <p class="text-center mt-4 text-xs text-slate-400">
        {{ isLogin ? '还没有账号？' : '已有账号？' }}
        <button class="text-primary font-semibold hover:underline" @click="toggleMode">
          {{ isLogin ? '注册新账号' : '去登录' }}
        </button>
      </p>
    </div>

    <!-- 用户协议弹窗 -->
    <el-dialog v-model="showAgreement" title="用户协议" width="560px" top="10vh">
      <div class="agreement-text">
        <p><strong>豆丁用户协议</strong></p>
        <p>欢迎使用豆丁拼豆图纸工具。</p>
        <p>1. 用户注册即表示同意本协议；</p>
        <p>2. 用户需对上传和发布的内容负责，不得上传违法、违规或侵犯他人权益的信息；</p>
        <p>3. 平台有权对违规内容进行下架处理，并保留追究法律责任的权利；</p>
        <p>4. 用户发布的设计作品默认允许其他用户在平台内浏览；</p>
        <p>5. 平台尊重用户知识产权，未经用户许可不会将作品用于商业用途。</p>
      </div>
    </el-dialog>

    <!-- 隐私政策弹窗 -->
    <el-dialog v-model="showPrivacy" title="隐私政策" width="560px" top="10vh">
      <div class="agreement-text">
        <p><strong>豆丁隐私政策</strong></p>
        <p>1. 手机号仅用于账号注册、安全验证和找回密码，不会被公开或用于其他目的；</p>
        <p>2. 用户创作数据存储于阿里云服务器，采用加密传输和存储；</p>
        <p>3. 用户可以随时在设置中查看和管理个人信息；</p>
        <p>4. 用户可申请注销账号，注销后所有个人数据将被永久删除；</p>
        <p>5. 本政策可能随法律法规要求更新，更新后将在平台公告。</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'

const router = useRouter()
const auth = useAuth()
const toast = useToast()

// ===== 通用状态 =====
const isLogin = ref(true)
const isResetPwd = ref(false)
const username = ref('')
const password = ref('')
const phone = ref('')
const code = ref('')
const nickname = ref('')
const submitting = ref(false)

// ===== 验证码 =====
const codeSending = ref(false)
const codeBtnText = ref('获取验证码')

// ===== 注册专用 =====
const confirmPw = ref('')
const agreed = ref(false)
const showPw = ref(false)
const showConfirmPw = ref(false)
const phoneError = ref(false)
const codeError = ref(false)
const pwError = ref(false)
const confirmError = ref(false)
const showAgreement = ref(false)
const showPrivacy = ref(false)

// ===== 计算 =====
const confirmOk = computed(() => confirmPw.value && confirmPw.value === password.value)
const canRegister = computed(() => {
  const phoneOk = /^1[3-9]\d{9}$/.test(phone.value)
  const codeOk = /^\d{6}$/.test(code.value)
  const pwOk = password.value && password.value.length >= 6
  const confirmOkVal = confirmPw.value === password.value
  return phoneOk && codeOk && pwOk && confirmOkVal && agreed.value
})

// ===== 方法 =====
function toggleMode() {
  isLogin.value = !isLogin.value
  phone.value = ''; code.value = ''; password.value = ''
  confirmPw.value = ''; agreed.value = false
  phoneError.value = false; codeError.value = false
  pwError.value = false; confirmError.value = false
}

async function sendCode() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    phoneError.value = true
    return
  }
  codeSending.value = true
  try {
    // scene: register=注册需手机号未注册, reset=重置密码需手机号已注册
    const scene = isResetPwd.value ? 'reset' : 'register'
    await API.post('/api/auth/send-code', { phone: phone.value.trim(), scene }, false)
    toast.show('验证码已发送')
    let t = 60
    codeBtnText.value = `${t}s`
    const timer = setInterval(() => {
      t--; codeBtnText.value = `${t}s`
      if (t <= 0) { clearInterval(timer); codeSending.value = false; codeBtnText.value = '重新获取' }
    }, 1000)
  } catch (e) {
    codeSending.value = false
    codeBtnText.value = '获取验证码'
    toast.show(e.message)
  }
}

async function handleResetPwd() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) { phoneError.value = true; return }
  if (!password.value || password.value.length < 6) { toast.show('密码至少需要6位'); return }
  if (password.value !== confirmPw.value) { confirmError.value = true; return }

  submitting.value = true
  try {
    await API.put('/api/auth/reset-password', {
      phone: phone.value.trim(),
      code: code.value,
      password: password.value,
      confirmPassword: confirmPw.value,
    }, false)
    toast.show('密码已重置，请登录')
    isResetPwd.value = false
    password.value = ''; confirmPw.value = ''; code.value = ''
  } catch (e) {
    toast.show(e.message)
  }
  submitting.value = false
}

async function handleSubmit() {
  // 注册前校验
  if (!isLogin.value) {
    if (!/^1[3-9]\d{9}$/.test(phone.value)) { phoneError.value = true; return }
    if (!/^\d{6}$/.test(code.value)) { codeError.value = true; return }
    if (!password.value || password.value.length < 6) { pwError.value = true; return }
    if (password.value !== confirmPw.value) { confirmError.value = true; return }
    if (!agreed.value) { toast.show('请先同意用户协议和隐私政策'); return }
  }

  submitting.value = true
  try {
    let endpoint, body
    if (isLogin.value) {
      endpoint = '/api/auth/login'
      body = { phone: phone.value.trim(), password: password.value }
    } else {
      endpoint = '/api/auth/register'
      body = {
        phone: phone.value.trim(),
        code: code.value,
        password: password.value,
        confirmPassword: confirmPw.value,
        nickname: nickname.value.trim() || undefined,
      }
    }
    const res = await API.post(endpoint, body, false)
    auth.setAuth(res.data.token, res.data.user)
    toast.show(isLogin.value ? '登录成功！' : '注册成功！')
    router.push('/')
  } catch (e) {
    // 409 = 手机号已注册
    if (e.message.includes('已注册')) {
      toast.show(e.message)
      setTimeout(() => { isLogin.value = true; mode.value = 'phone' }, 1500)
    } else {
      toast.show(e.message)
    }
  }
  submitting.value = false
}
</script>

<style scoped>
.auth-bg {
  @apply flex items-center justify-center h-full p-5;
  background: linear-gradient(135deg, rgba(239,246,255,0.6), rgba(248,250,252,1), rgba(239,246,255,0.4));
}
.auth-card {
  @apply bg-white rounded-2xl shadow-lg p-6 w-full max-w-[380px];
}
.mode-switch {
  @apply flex bg-slate-100 rounded-xl p-1 mb-4;
}
.mode-switch button {
  @apply flex-1 py-1.5 rounded-lg text-xs font-medium transition-all text-slate-500;
}
.mode-switch button.active {
  @apply bg-white text-primary shadow-sm;
}
.field {
  @apply mb-3;
}
.field label {
  @apply block text-xs font-semibold text-slate-500 mb-1;
}
.field.error .input { @apply border-red-400 focus:ring-red-100; }
.field.success .input { @apply border-green-400 focus:ring-green-100; }
.input {
  @apply w-full h-10 border border-slate-200 rounded-lg px-3 text-sm
    focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors outline-none;
}
.input-wrap { @apply relative; }
.input-wrap .input { @apply pr-10; }
.toggle-pw { @apply absolute right-3 top-1/2 -translate-y-1/2 text-base; }
.phone-prefix {
  @apply flex items-center h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 whitespace-nowrap;
}
.code-btn {
  @apply h-10 px-3 rounded-lg text-xs font-medium text-white transition-colors flex-shrink-0;
  background: #0058BC;
}
.code-btn:hover { background: #004a9e; }
.code-btn:disabled { @apply opacity-50 cursor-not-allowed; }
.submit-btn {
  @apply w-full h-10 rounded-xl text-white font-semibold text-sm
    active:scale-[0.98] transition-all mt-2;
  background: #0058BC;
}
.submit-btn:hover { background: #004a9e; }
.submit-btn:disabled { @apply opacity-40 cursor-not-allowed; }
.error-msg { @apply text-xs text-red-500 mt-1; }
.success-msg { @apply text-xs text-green-500 mt-1; }
.checkbox { @apply w-4 h-4 accent-primary; }
.agreement-text {
  @apply text-sm text-slate-600 leading-relaxed max-h-[400px] overflow-y-auto;
}
.agreement-text p { @apply mb-2; }
.text-primary { color: #0058BC; }
.mt-1 { margin-top: 4px; }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.mb-2 { margin-bottom: 8px; }
.mb-5 { margin-bottom: 20px; }
.ml-2 { margin-left: 8px; }
</style>
