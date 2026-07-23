// ============================================
//  authStore — 用户认证状态（Pinia）
//  替代 useAuth.js 中的模块级 ref 单例模式
// ============================================
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import API from '@/api/index.js'

/**
 * 认证状态管理
 * - token/user 持久化到 localStorage
 * - 自动注入 token getter 到 API 层
 */
export const useAuthStore = defineStore('auth', () => {
  // ---- 状态 ----
  const token = ref(localStorage.getItem('douding_token') || null)
  const user = ref(JSON.parse(localStorage.getItem('douding_user') || 'null'))

  // ---- 计算属性 ----
  const isLoggedIn = computed(() => !!token.value && !!user.value)

  // ---- 操作 ----
  function setAuth(t, u) {
    token.value = t
    user.value = u
    localStorage.setItem('douding_token', t)
    localStorage.setItem('douding_user', JSON.stringify(u))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('douding_token')
    localStorage.removeItem('douding_user')
  }

  async function refreshUser() {
    try {
      const res = await API.get('/api/auth/me')
      user.value = res.data
      localStorage.setItem('douding_user', JSON.stringify(res.data))
    } catch {
      // token 失效，忽略
    }
  }

  return { token, user, isLoggedIn, setAuth, logout, refreshUser }
})
