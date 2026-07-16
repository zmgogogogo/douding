// ============================================
//  useAuth — 用户认证状态管理（组合式函数）
// ============================================
import { ref, computed } from 'vue'
import API, { setTokenGetter } from '@/api/index.js'

// 全局认证状态（单例）
const token = ref(localStorage.getItem('douding_token') || null)
const user = ref(JSON.parse(localStorage.getItem('douding_user') || 'null'))

// 注入 token getter 到 API 层
setTokenGetter(() => token.value)

export function useAuth() {
  const isLoggedIn = computed(() => !!token.value && !!user.value)

  // 登录：保存 token 和用户信息到 localStorage
  function setAuth(t, u) {
    token.value = t
    user.value = u
    localStorage.setItem('douding_token', t)
    localStorage.setItem('douding_user', JSON.stringify(u))
  }

  // 登出
  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('douding_token')
    localStorage.removeItem('douding_user')
  }

  // 从服务器刷新用户信息
  async function refreshUser() {
    try {
      const res = await API.get('/api/auth/me')
      user.value = res.data
      localStorage.setItem('douding_user', JSON.stringify(res.data))
    } catch { /* token 失效，忽略 */ }
  }

  return { token, user, isLoggedIn, setAuth, logout, refreshUser }
}
