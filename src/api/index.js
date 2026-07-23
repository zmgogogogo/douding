// ============================================
//  API 请求层 — 封装 fetch，自动附加 JWT
// ============================================

const BASE = ''

// 认证状态由 useAuth composable 管理，这里通过函数获取
let getToken = () => null

export function setTokenGetter(fn) {
  getToken = fn
}

async function request(method, url, body, auth = true) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  const token = getToken()
  if (auth && token) opts.headers['Authorization'] = 'Bearer ' + token
  if (body && method !== 'GET') opts.body = JSON.stringify(body)

  const res = await fetch(BASE + url, opts)
  const data = await res.json()
  if (!res.ok && data.code !== 200) {
    throw new Error(data.message || '请求失败')
  }
  return data
}

// 带文件上传的请求
async function upload(url, formData, auth = true) {
  const opts = { method: 'POST', body: formData }
  const token = getToken()
  if (auth && token) opts.headers = { Authorization: 'Bearer ' + token }
  const res = await fetch(BASE + url, opts)
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    const text = await res.text()
    throw new Error(res.status === 413 ? '图片过大，请压缩后重试' : `服务器错误 (${res.status})`)
  }
  return res.json()
}

// 下载文件（返回 Blob，用于导出功能）
async function download(url, body = null, auth = true) {
  const opts = {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
  }
  const token = getToken()
  if (auth && token) opts.headers['Authorization'] = 'Bearer ' + token
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(BASE + url, opts)
  if (!res.ok) throw new Error('下载失败')
  return res.blob()
}

export default {
  get: (url, auth = true) => request('GET', url, null, auth),
  post: (url, body, auth = true) => request('POST', url, body, auth),
  put: (url, body, auth = true) => request('PUT', url, body, auth),
  del: (url, auth = true) => request('DELETE', url, null, auth),
  upload,
  download,
}
