// ============================================
//  管理端 API 请求层 — 封装 fetch，自动附加管理员 JWT
// ============================================

const ADMIN_TOKEN_KEY = 'douding_admin_token'

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || null
}

async function request(method, url, body, auth = true, timeout = 30000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, signal: controller.signal }
    const token = getAdminToken()
    if (auth && token) opts.headers['Authorization'] = 'Bearer ' + token
    if (body && method !== 'GET') opts.body = JSON.stringify(body)

    const res = await fetch(url, opts)
    const data = await res.json()

    // 401 时清除过期 token
    if (data.code === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY)
    }
    if (!res.ok && data.code !== 200) {
      throw new Error(data.message || '请求失败')
    }
    return data
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('请求超时，请检查网络后重试')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

export default {
  get: (url, auth = true) => request('GET', url, null, auth),
  post: (url, body, auth = true) => request('POST', url, body, auth),
  put: (url, body, auth = true) => request('PUT', url, body, auth),
  del: (url, auth = true) => request('DELETE', url, null, auth),
}

export { ADMIN_TOKEN_KEY }
