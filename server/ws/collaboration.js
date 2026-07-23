/**
 * 协作服务 — 实时同步引擎
 *
 * 核心设计：
 * - 房间 = 一个设计图纸（designId）
 * - 每个房间维护在线成员列表和图纸状态
 * - 增量同步：只广播变更的像素，不传全量
 * - 操作锁：同一格子同时只能一人编辑（乐观锁）
 * - 断线重连时发送全量快照
 */

const rooms = new Map() // designId → { members: Map<socketId, Member>, locks: Set }

/**
 * @typedef {{ socketId: string, userId: number, username: string, nickname: string, color: string, cursor?: {r:number,c:number} }} Member
 */

// 给每个协作者分配一个颜色标识
const MEMBER_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
]

function getRoom(designId) {
  if (!rooms.has(designId)) {
    rooms.set(designId, { members: new Map(), locks: new Set() })
  }
  return rooms.get(designId)
}

/**
 * 加入房间
 * @param {object} io — Socket.IO server
 * @param {object} socket
 * @param {{ designId: string, userId: number, username: string, nickname: string }} data
 */
function joinRoom(io, socket, { designId, userId, username, nickname }) {
  if (!designId) return

  socket.join(designId)
  const room = getRoom(designId)

  // 分配颜色
  const colorIdx = room.members.size % MEMBER_COLORS.length
  const member = {
    socketId: socket.id,
    userId,
    username,
    nickname: nickname || username,
    color: MEMBER_COLORS[colorIdx],
    joinedAt: Date.now(),
  }

  room.members.set(socket.id, member)
  socket.data.designId = designId
  socket.data.member = member

  // 广播成员列表变更
  io.to(designId).emit('collab:members', getMemberList(designId))

  // 通知其他人新成员加入
  socket.to(designId).emit('collab:memberJoined', {
    socketId: socket.id,
    nickname: member.nickname,
    color: member.color,
  })

  console.log(`[WS] ${member.nickname} 加入房间 ${designId}（${room.members.size}人在线）`)
}

/**
 * 离开房间
 */
function leaveRoom(io, socket) {
  const designId = socket.data.designId
  if (!designId) return

  const room = rooms.get(designId)
  if (!room) return

  const member = room.members.get(socket.id)
  room.members.delete(socket.id)

  // 释放该成员持有的锁
  for (const key of room.locks) {
    if (key.startsWith(socket.id + ':')) room.locks.delete(key)
  }

  socket.leave(designId)

  // 广播成员离开
  io.to(designId).emit('collab:members', getMemberList(designId))
  io.to(designId).emit('collab:memberLeft', { socketId: socket.id })

  console.log(`[WS] ${member?.nickname || socket.id} 离开房间 ${designId}`)

  // 清理空房间
  if (room.members.size === 0) {
    rooms.delete(designId)
  }
}

/**
 * 像素变更 — 增量同步
 * @param {object} socket
 * @param {Array<{r:number, c:number, colorIndex:number}>} changes
 */
function broadcastPixelChanges(io, socket, changes) {
  const designId = socket.data.designId
  const member = socket.data.member
  if (!designId || !member || !changes?.length) return

  // 乐观锁检查：如果有他人正在编辑的格子，跳过冲突
  const room = rooms.get(designId)
  const validChanges = []

  for (const ch of changes) {
    const lockKey = `${ch.r},${ch.c}`
    const existingLock = [...room.locks].find((l) => l.endsWith(':' + lockKey))
    if (existingLock && !existingLock.startsWith(socket.id + ':')) {
      // 他人已锁定该格，跳过
      continue
    }
    validChanges.push(ch)
    // 设定锁（自动 3 秒过期）
    const myLock = socket.id + ':' + lockKey
    room.locks.add(myLock)
    setTimeout(() => room.locks.delete(myLock), 3000)
  }

  if (validChanges.length === 0) return

  // 广播给房间内其他人
  socket.to(designId).emit('collab:pixelChange', {
    socketId: socket.id,
    nickname: member.nickname,
    changes: validChanges,
  })
}

/**
 * 光标移动
 */
function broadcastCursor(io, socket, { r, c }) {
  const designId = socket.data.designId
  const member = socket.data.member
  if (!designId || !member) return

  member.cursor = { r, c }

  socket.to(designId).emit('collab:cursorMove', {
    socketId: socket.id,
    nickname: member.nickname,
    color: member.color,
    r,
    c,
  })
}

/**
 * 获取房间成员列表
 */
function getMemberList(designId) {
  const room = rooms.get(designId)
  if (!room) return []
  return [...room.members.values()].map((m) => ({
    socketId: m.socketId,
    userId: m.userId,
    nickname: m.nickname,
    color: m.color,
    cursor: m.cursor,
  }))
}

/**
 * 请求全量快照（新成员加入或断线重连时）
 */
function requestSnapshot(io, socket) {
  const designId = socket.data.designId
  if (!designId) return

  // 通知房间内第一个人发送快照
  const room = rooms.get(designId)
  const firstMember = [...room.members.values()].find((m) => m.socketId !== socket.id)
  if (firstMember) {
    io.to(firstMember.socketId).emit('collab:requestSnapshot', {
      requesterId: socket.id,
    })
  }
}

export {
  joinRoom,
  leaveRoom,
  broadcastPixelChanges,
  broadcastCursor,
  getMemberList,
  requestSnapshot,
}
