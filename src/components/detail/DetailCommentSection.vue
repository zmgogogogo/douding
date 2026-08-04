<!-- ============================================
  DetailCommentSection.vue — 作品详情页评论区
  支持一级评论 + 楼中楼回复 + 点赞 + 分页加载
  文档参考: .claude/作品详情.md §3.4
============================================ -->
<template>
  <div class="comment-section">
    <!-- 头部 -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-semibold text-slate-800">
        评论区 <span v-if="total > 0" class="text-slate-400 font-normal">({{ total }})</span>
      </h3>
    </div>

    <!-- 评论输入框 -->
    <div class="mb-4">
      <div class="relative">
        <textarea
          v-model="commentText"
          :disabled="!isLoggedIn"
          :placeholder="isLoggedIn ? '写下你的评论...' : '登录后发表评论'"
          maxlength="500"
          rows="3"
          class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl resize-none
                 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10
                 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
                 placeholder:text-slate-300 transition-all duration-150"
          @focus="!isLoggedIn && $emit('require-login')"
          @keydown.enter.ctrl="handleSubmit"
        />
        <div class="flex items-center justify-between mt-1.5">
          <span class="text-[11px] text-slate-400">{{ commentText.length }}/500</span>
          <button
            :disabled="!canSubmit"
            class="px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-150
                   disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            :class="canSubmit ? 'bg-primary text-white hover:bg-primary/90' : 'bg-slate-100 text-slate-400'"
            @click="handleSubmit"
          >
            发布
          </button>
        </div>
      </div>
    </div>

    <!-- 评论列表 -->
    <div v-if="loading" class="text-center py-8 text-slate-400 text-sm">加载中...</div>

    <div v-else-if="comments.length === 0" class="text-center py-8">
      <p class="text-slate-400 text-sm">暂无评论，来说两句吧</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="group"
      >
        <!-- 一级评论 -->
        <div class="flex gap-2.5">
          <!-- 头像 -->
          <div
            class="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden cursor-pointer"
            @click="$router.push(`/user/${comment.user.id}`)"
          >
            <img
              v-if="comment.user.avatar"
              :src="comment.user.avatar"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-slate-400 text-xs">
              {{ (comment.user.nickname || '?')[0] }}
            </div>
          </div>

          <!-- 内容 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span
                class="text-xs font-semibold text-slate-700 cursor-pointer hover:text-primary"
                @click="$router.push(`/user/${comment.user.id}`)"
              >{{ comment.user.nickname }}</span>
              <span
                v-if="comment.isAuthor"
                class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium border border-amber-200"
              >作者</span>
              <span class="text-[11px] text-slate-400">{{ formatTime(comment.createdAt) }}</span>
            </div>
            <p class="text-sm text-slate-600 leading-relaxed break-words">{{ comment.content }}</p>

            <!-- 操作行 -->
            <div class="flex items-center gap-3 mt-1.5">
              <button
                class="flex items-center gap-1 text-[11px] transition-all duration-150 active:scale-90"
                :class="comment.isLiked ? 'text-red-500' : 'text-slate-400 hover:text-slate-600'"
                @click="handleCommentLike(comment)"
              >
                <span>{{ comment.isLiked ? '❤️' : '🤍' }}</span>
                <span v-if="comment.likeNum > 0">{{ comment.likeNum }}</span>
              </button>
              <button
                class="text-[11px] text-slate-400 hover:text-slate-600 transition-all duration-150"
                @click="toggleReplyInput(comment.id)"
              >
                💬 回复
              </button>
            </div>

            <!-- 楼中楼回复列表 -->
            <div v-if="comment.replies && comment.replies.length > 0" class="mt-2 pl-3 border-l-2 border-slate-100 space-y-2">
              <div
                v-for="reply in comment.replies"
                :key="reply.id"
                class="text-sm"
              >
                <span
                  class="text-xs font-semibold text-slate-600 cursor-pointer hover:text-primary"
                  @click="$router.push(`/user/${reply.user.id}`)"
                >{{ reply.user.nickname }}</span>
                <span
                  v-if="reply.replyToNickname"
                  class="text-xs text-slate-400"
                > 回复 </span>
                <span
                  v-if="reply.replyToNickname"
                  class="text-xs font-semibold text-slate-600"
                >{{ reply.replyToNickname }}</span>
                <span class="text-xs text-slate-400 mx-1">:</span>
                <span class="text-xs text-slate-500">{{ reply.content }}</span>
                <span class="text-[10px] text-slate-400 ml-2">{{ formatTime(reply.createdAt) }}</span>
              </div>
            </div>

            <!-- 回复输入框 -->
            <div v-if="replyTarget === comment.id" class="mt-2 flex gap-2">
              <input
                ref="replyInputRef"
                v-model="replyText"
                :placeholder="'回复 ' + comment.user.nickname + '...'"
                maxlength="500"
                class="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg
                       focus:outline-none focus:border-primary/40 transition-all duration-150"
                @keydown.enter="handleReply(comment)"
              />
              <button
                class="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg
                       hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-40"
                :disabled="!replyText.trim()"
                @click="handleReply(comment)"
              >发送</button>
              <button
                class="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-all duration-150"
                @click="replyTarget = null"
              >取消</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="hasMore" class="text-center pt-2">
        <button
          class="text-xs text-primary hover:text-primary/80 font-medium transition-all duration-150"
          @click="loadMore"
        >
          加载更多评论
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'

const props = defineProps({
  workId: { type: [Number, String], required: true },
  authorId: { type: [Number, String], default: 0 },
})

const emit = defineEmits(['require-login'])

const auth = useAuth()
const toast = useToast()

const isLoggedIn = computed(() => auth.isLoggedIn.value)

const comments = ref([])
const total = ref(0)
const hasMore = ref(false)
const loading = ref(false)
const page = ref(1)

const commentText = ref('')
const replyText = ref('')
const replyTarget = ref(null)
const replyInputRef = ref(null)

const canSubmit = computed(() => isLoggedIn.value && commentText.value.trim().length > 0)

// 加载评论列表
async function fetchComments(reset = false) {
  if (loading.value) return
  if (reset) page.value = 1

  loading.value = true
  try {
    const res = await API.get(
      `/api/work/comment/list?workId=${props.workId}&page=${page.value}&pageSize=10`,
      auth.isLoggedIn.value
    )
    const data = res.data
    if (reset) {
      comments.value = data.list || []
    } else {
      comments.value = [...comments.value, ...(data.list || [])]
    }
    total.value = data.total || 0
    hasMore.value = data.hasMore || false
  } catch (e) {
    toast.show(e.message)
  } finally {
    loading.value = false
  }
}

function loadMore() {
  page.value++
  fetchComments(false)
}

// 发布评论
async function handleSubmit() {
  if (!canSubmit.value) return
  try {
    await API.post('/api/work/comment/add', {
      workId: props.workId,
      content: commentText.value.trim(),
    })
    commentText.value = ''
    fetchComments(true)
    toast.show('评论已发布')
  } catch (e) {
    toast.show(e.message)
  }
}

// 切换回复输入框
function toggleReplyInput(commentId) {
  if (!isLoggedIn.value) {
    emit('require-login')
    return
  }
  replyTarget.value = replyTarget.value === commentId ? null : commentId
  replyText.value = ''
  nextTick(() => {
    if (replyTarget.value && replyInputRef.value) {
      replyInputRef.value.focus()
    }
  })
}

// 发送回复
async function handleReply(comment) {
  if (!replyText.value.trim()) return
  try {
    await API.post('/api/work/comment/reply', {
      commentId: comment.id,
      workId: props.workId,
      content: replyText.value.trim(),
      replyToUid: comment.user.id,
    })
    replyText.value = ''
    replyTarget.value = null
    fetchComments(true)
    toast.show('回复已发送')
  } catch (e) {
    toast.show(e.message)
  }
}

// 评论点赞
async function handleCommentLike(comment) {
  if (!isLoggedIn.value) {
    emit('require-login')
    return
  }
  try {
    const res = await API.post('/api/work/comment/like', { commentId: comment.id })
    comment.isLiked = res.data.liked
    comment.likeNum = res.data.likeNum
  } catch (e) {
    toast.show(e.message)
  }
}

// 格式化时间
function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
  return d.toLocaleDateString('zh-CN')
}

// 初始化
fetchComments(true)

defineExpose({ refresh: () => fetchComments(true) })
</script>
