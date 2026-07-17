/**
 * 协作管理器 — 客户端 Socket.IO 实时协作
 *
 * 功能：
 * - 加入/离开协作房间
 * - 发送/接收像素变更
 * - 多光标同步
 * - 评论批注
 * - 断线重连 + 快照恢复
 */

import { ref, reactive, computed, shallowRef } from 'vue'
import { io } from 'socket.io-client'
import { useAuth } from './useAuth.js'

// 模块级单例
let socket = null
const connected = ref(false)
const members = ref([])               // 在线成员列表
const remoteCursors = reactive({})    // socketId → {r, c, nickname, color}
const comments = ref([])              // 批注列表
const currentDesignId = ref(null)

/**
 * 连接到协作服务器
 * @returns {Promise<void>}
 */
function connect() {
  return new Promise((resolve) => {
    if (socket?.connected) { resolve(); return }

    const auth = useAuth()
    const token = auth.token?.value || localStorage.getItem('douding_token')

    socket = io('/', {
      path: '/ws',
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })

    socket.on('connect', () => {
      connected.value = true
      console.log('[Collab] 已连接')
      resolve()
    })

    socket.on('disconnect', () => {
      connected.value = false
      console.log('[Collab] 已断开')
    })

    // 成员列表更新
    socket.on('collab:members', (list) => {
      members.value = list
    })

    // 成员加入
    socket.on('collab:memberJoined', ({ socketId, nickname, color }) => {
      console.log(`[Collab] ${nickname} 加入了`)
    })

    // 成员离开 → 清除光标
    socket.on('collab:memberLeft', ({ socketId }) => {
      delete remoteCursors[socketId]
    })

    // 接收像素变更
    socket.on('collab:pixelChange', (data) => {
      // 由调用方通过回调处理
      _onPixelChange(data)
    })

    // 接收光标移动
    socket.on('collab:cursorMove', ({ socketId, nickname, color, r, c }) => {
      remoteCursors[socketId] = { r, c, nickname, color }
    })

    // 接收快照请求 → 发送当前完整状态
    socket.on('collab:requestSnapshot', ({ requesterId }) => {
      if (_onRequestSnapshot) {
        const snapshot = _onRequestSnapshot()
        socket.emit('collab:sendSnapshot', { requesterId, snapshot })
      }
    })

    // 接收全量快照
    socket.on('collab:snapshot', (snapshot) => {
      if (_onSnapshot) _onSnapshot(snapshot)
    })

    // 接收评论
    socket.on('collab:commentAdded', (comment) => {
      comments.value.push(comment)
    })

    socket.on('collab:commentResolved', ({ commentId }) => {
      const c = comments.value.find(c => c.id === commentId)
      if (c) c.resolved = true
    })
  })
}

// 回调注册
let _onPixelChange = () => {}
let _onRequestSnapshot = null
let _onSnapshot = null

function onPixelChange(fn) { _onPixelChange = fn }
function onRequestSnapshot(fn) { _onRequestSnapshot = fn }
function onSnapshot(fn) { _onSnapshot = fn }

/**
 * 加入设计房间
 * @param {string} designId
 * @param {{userId:number, username:string, nickname:string}} user
 */
function joinDesign(designId, user) {
  if (!socket?.connected) return
  currentDesignId.value = designId
  socket.emit('collab:join', {
    designId,
    userId: user.userId,
    username: user.username,
    nickname: user.nickname,
  })
}

/** 离开当前房间 */
function leaveDesign() {
  if (!socket?.connected) return
  socket.emit('collab:leave')
  currentDesignId.value = null
  members.value = []
  Object.keys(remoteCursors).forEach(k => delete remoteCursors[k])
}

/** 发送像素变更 */
function sendPixelChanges(changes) {
  if (!socket?.connected || !currentDesignId.value) return
  socket.emit('collab:pixelChange', changes)
}

/** 发送光标位置 */
function sendCursor(r, c) {
  if (!socket?.connected || !currentDesignId.value) return
  socket.emit('collab:cursorMove', { r, c })
}

/** 添加评论 */
function addComment(comment) {
  if (!socket?.connected || !currentDesignId.value) return
  comment.id = 'c' + Date.now()
  socket.emit('collab:addComment', comment)
}

/** 解决评论 */
function resolveComment(commentId) {
  if (!socket?.connected) return
  socket.emit('collab:resolveComment', { commentId })
}

/** 断开连接 */
function disconnect() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  connected.value = false
}

export function useCollaboration() {
  return {
    // 状态
    connected,
    members,
    remoteCursors,
    comments,
    currentDesignId,

    // 连接
    connect,
    disconnect,

    // 房间
    joinDesign,
    leaveDesign,

    // 同步
    sendPixelChanges,
    sendCursor,

    // 回调
    onPixelChange,
    onRequestSnapshot,
    onSnapshot,

    // 评论
    addComment,
    resolveComment,
  }
}
