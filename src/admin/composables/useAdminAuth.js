// ============================================
//  useAdminAuth — 管理员认证状态管理
// ============================================
import { ref, computed } from 'vue'
import adminAPI, { ADMIN_TOKEN_KEY } from '@/api/admin.js'

// 全局单例状态
const token = ref(localStorage.getItem(ADMIN_TOKEN_KEY) || null)
const admin = ref(JSON.parse(localStorage.getItem('douding_admin_user') || 'null'))

export function useAdminAuth() {
  const isLoggedIn = computed(() => !!token.value && !!admin.value)

  /** 登录成功：保存 token 和管理员信息 */
  function setAuth(t, a) {
    token.value = t
    admin.value = a
    localStorage.setItem(ADMIN_TOKEN_KEY, t)
    localStorage.setItem('douding_admin_user', JSON.stringify(a))
  }

  /** 登出 */
  function logout() {
    token.value = null
    admin.value = null
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem('douding_admin_user')
  }

  /** 从服务器刷新管理员信息 */
  async function refreshAdmin() {
    try {
      const res = await adminAPI.get('/api/admin/auth/me')
      admin.value = res.data
      localStorage.setItem('douding_admin_user', JSON.stringify(res.data))
    } catch {
      logout()
    }
  }

  /** 检查是否拥有某个权限 */
  function hasPermission(perm) {
    if (!admin.value) return false
    // 超级管理员（无 roleId）拥有所有权限
    if (!admin.value.roleId) return true
    return (admin.value.permissions || []).includes(perm)
  }

  return { token, admin, isLoggedIn, setAuth, logout, refreshAdmin, hasPermission }
}
