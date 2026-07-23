/**
 * WebSocket 服务 — Socket.IO 实时协作引擎
 *
 * 绑定到 Express HTTP Server，处理协作事件
 */

import { Server } from 'socket.io'
import * as collab from './collaboration.js'
import { verifyToken } from '../utils/jwt.js'

/**
 * 初始化 Socket.IO
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
function initSocketIO(httpServer) {
  const io = new Server(httpServer, {
    path: '/ws',
    cors: {
      origin: true,
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  })

  // 简单的 token 认证中间件
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) {
      // 允许匿名连接（查看模式）
      socket.data.userId = null
      socket.data.username = 'guest'
      return next()
    }

    try {
      const payload = verifyToken(token)
      socket.data.userId = payload.userId
      socket.data.username = payload.username
      next()
    } catch (e) {
      // token 无效，仍允许连接但标记为访客
      socket.data.userId = null
      socket.data.username = 'guest'
      next()
    }
  })

  io.on('connection', (socket) => {
    console.log(`[WS] 新连接: ${socket.id}`)

    // ---- 房间操作 ----
    socket.on('collab:join', (data) => collab.joinRoom(io, socket, data))
    socket.on('collab:leave', () => collab.leaveRoom(io, socket))

    // ---- 像素同步 ----
    socket.on('collab:pixelChange', (changes) => collab.broadcastPixelChanges(io, socket, changes))

    // ---- 光标同步 ----
    socket.on('collab:cursorMove', (pos) => collab.broadcastCursor(io, socket, pos))

    // ---- 快照请求 ----
    socket.on('collab:requestSnapshot', () => collab.requestSnapshot(io, socket))

    // 发送完整快照给指定请求者
    socket.on('collab:sendSnapshot', ({ requesterId, snapshot }) => {
      io.to(requesterId).emit('collab:snapshot', snapshot)
    })

    // ---- 评论批注 ----
    socket.on('collab:addComment', (comment) => {
      const designId = socket.data.designId
      if (!designId) return
      comment.socketId = socket.id
      comment.timestamp = Date.now()
      io.to(designId).emit('collab:commentAdded', comment)
    })

    socket.on('collab:resolveComment', ({ commentId }) => {
      const designId = socket.data.designId
      if (!designId) return
      io.to(designId).emit('collab:commentResolved', { commentId })
    })

    // ---- 断开 ----
    socket.on('disconnect', () => {
      collab.leaveRoom(io, socket)
      console.log(`[WS] 断开: ${socket.id}`)
    })
  })

  console.log('[WS] Socket.IO 协作引擎已就绪')
  return io
}

export { initSocketIO }
