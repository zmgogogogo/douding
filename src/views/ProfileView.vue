<!-- ============================================
  ProfileView.vue — 用户主页（本人 / 他人双视图）
  路由：/user/:id
  文档参考：.claude/他人主页.md
============================================ -->
<template>
  <div class="overflow-y-auto h-full pb-8">
    <!-- ===== 加载中 ===== -->
    <div v-if="loading" class="flex items-center justify-center py-32">
      <span class="text-slate-400 text-sm">加载中...</span>
    </div>

    <!-- ===== 用户不存在 ===== -->
    <div v-else-if="notFound" class="flex flex-col items-center py-16 px-6">
      <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <UserIcon :size="32" class="text-slate-300" />
      </div>
      <h1 class="text-lg font-bold text-slate-900">用户不存在</h1>
      <p class="text-slate-400 text-sm mt-1">该用户已注销或账号异常</p>
      <button
        class="mt-6 px-10 py-3 bg-primary text-white rounded-full font-bold text-sm active:scale-95 transition-all"
        @click="$router.push('/login')"
      >
        注册 / 登录
      </button>
    </div>

    <!-- ===== 主页内容 ===== -->
    <template v-else-if="profile">
      <!-- ====== 头部个人信息卡片 ====== -->
      <section
        class="mx-4 mt-4 bg-white rounded-[1.5rem] shadow-sm border border-slate-100/50 overflow-hidden"
      >
        <div class="flex items-center gap-4 px-5 pt-5 pb-4">
          <!-- 头像（可点击放大） -->
          <div class="relative flex-shrink-0 cursor-pointer" @click="previewAvatar">
            <div
              class="w-[60px] h-[60px] rounded-full p-0.5 bg-gradient-to-b from-primary/20 to-transparent"
            >
              <img
                v-if="profile.avatar"
                :src="profile.avatar"
                class="w-full h-full rounded-full object-cover shadow-sm"
              />
              <div
                v-else
                class="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-slate-300"
              >
                <UserIcon :size="28" />
              </div>
            </div>
          </div>

          <!-- 用户名 & 简介 -->
          <div class="flex-1 min-w-0">
            <h1 class="text-[17px] font-bold tracking-tight text-slate-900 truncate">
              {{ profile.nickname || profile.username }}
            </h1>
            <p class="text-xs text-slate-400 mt-1 truncate">
              {{ profile.bio || '每一颗拼豆都是一段色彩的旅程' }}
            </p>
          </div>

          <!-- 操作按钮 -->
          <!-- 本人：编辑资料 -->
          <button
            v-if="isSelf"
            class="flex-shrink-0 w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-90 transition-all"
            @click="openEditModal"
          >
            <SettingsIcon :size="18" />
          </button>
        </div>

        <!-- 统计行 -->
        <div class="flex border-t border-slate-100 mx-1">
          <div
            class="flex-1 flex flex-col items-center py-3 cursor-pointer active:bg-slate-50/80 transition-colors"
            @click="activeTab = 'works'"
          >
            <span class="text-[17px] font-bold text-primary leading-tight">
              {{ loadingStats ? '...' : formatNum(stats.works) }}
            </span>
            <span class="text-[11px] text-slate-400 mt-0.5">作品</span>
          </div>
          <div class="w-px bg-slate-100 my-2.5" />
          <div
            class="flex-1 flex flex-col items-center py-3 cursor-pointer active:bg-slate-50/80 transition-colors"
            @click="openFollowersList"
          >
            <span class="text-[17px] font-bold text-primary leading-tight">
              {{ loadingStats ? '...' : formatNum(stats.followers) }}
            </span>
            <span class="text-[11px] text-slate-400 mt-0.5">粉丝</span>
          </div>
          <div class="w-px bg-slate-100 my-2.5" />
          <div
            class="flex-1 flex flex-col items-center py-3 cursor-pointer active:bg-slate-50/80 transition-colors"
            @click="openFollowingList"
          >
            <span class="text-[17px] font-bold text-primary leading-tight">
              {{ loadingStats ? '...' : formatNum(stats.following) }}
            </span>
            <span class="text-[11px] text-slate-400 mt-0.5">关注</span>
          </div>
          <div class="w-px bg-slate-100 my-2.5" />
          <div
            class="flex-1 flex flex-col items-center py-3 active:bg-slate-50/80 transition-colors"
          >
            <span class="text-[17px] font-bold text-primary leading-tight">
              {{ loadingStats ? '...' : formatNum(stats.totalLikes) }}
            </span>
            <span class="text-[11px] text-slate-400 mt-0.5">获赞</span>
          </div>
        </div>

        <!-- 关注按钮行（仅访客可见） -->
        <div v-if="!isSelf" class="px-4 pb-4">
          <button
            class="w-full h-11 rounded-full font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            :class="isFollow
              ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
              : 'bg-primary text-white shadow-lg shadow-primary/15 hover:opacity-90'"
            @click="handleFollow"
          >
            <UserPlusIcon v-if="!isFollow" :size="16" />
            <UserCheckIcon v-else :size="16" />
            <span>{{ isFollow ? '已关注' : '+ 关注' }}</span>
          </button>
        </div>
      </section>

      <!-- ====== Tab 导航（仅他人主页） ====== -->
      <div v-if="!isSelf" class="mx-4 mt-3 sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm rounded-2xl">
        <div class="flex border-b border-slate-200/60">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="flex-1 py-3 text-sm font-medium transition-all relative"
            :class="activeTab === tab.key
              ? 'text-primary'
              : 'text-slate-400 hover:text-slate-600'"
            @click="switchTab(tab.key)"
          >
            {{ tab.label }}
            <div
              v-if="activeTab === tab.key"
              class="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full"
            />
          </button>
        </div>
      </div>

      <!-- ====== 作品瀑布流（仅他人主页） ====== -->
      <div v-if="!isSelf" class="px-4 mt-3">
        <!-- 空状态 -->
        <div
          v-if="!loadingWorks && works.length === 0"
          class="flex flex-col items-center py-16"
        >
          <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <PackageIcon :size="24" class="text-slate-300" />
          </div>
          <p class="text-sm text-slate-400">{{ emptyText }}</p>
        </div>

        <!-- 瀑布流 -->
        <div v-else class="flex gap-1.5 md:gap-2">
          <div
            v-for="(col, ci) in columnGroups"
            :key="ci"
            class="flex-1 min-w-0 flex flex-col gap-1.5 md:gap-2"
          >
            <div
              v-for="item in col"
              :key="item.id"
              class="masonry-card"
              @click="$router.push('/detail/' + item.id)"
            >
              <!-- 缩略图 -->
              <div
                class="relative w-full bg-slate-100 overflow-hidden"
                :style="{ paddingBottom: thumbRatio(item) }"
              >
                <img
                  v-if="item.thumbnail"
                  :src="item.thumbnail"
                  :alt="item.title"
                  class="absolute inset-0 w-full h-full object-cover pixel-thumb"
                  loading="lazy"
                />
                <HomeThumbCanvas
                  v-else-if="item.gridData?.length"
                  class="absolute inset-0 w-full h-full"
                  :gridData="item.gridData"
                  :gridWidth="item.gridWidth"
                  :gridHeight="item.gridHeight"
                />
                <div v-else class="absolute inset-0 flex items-center justify-center text-2xl text-slate-300">🧩</div>
              </div>
              <!-- 信息区 -->
              <div class="p-2.5">
                <div class="text-[13px] font-bold text-slate-800 line-clamp-2 leading-snug mb-1.5">
                  {{ item.title }}
                </div>
                <div class="flex items-center justify-between text-[11px] text-slate-400">
                  <span class="truncate max-w-[72px]">{{ item.gridWidth }}×{{ item.gridHeight }}</span>
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      class="flex items-center gap-0.5 hover:text-red-500 transition-colors"
                      :class="item.isLiked ? 'text-red-500' : ''"
                      @click.stop="handleLike(item)"
                    >
                      <HeartIcon :size="12" :class="item.isLiked ? 'fill-red-500' : ''" />
                      {{ fmtNum(item.likesCount || 0) }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 加载更多 -->
        <div v-if="hasMore" class="flex justify-center py-6">
          <button
            class="px-8 py-2.5 rounded-full text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 active:scale-95 transition-all"
            :disabled="loadingMore"
            @click="loadMoreWorks"
          >
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </button>
        </div>

        <!-- 加载指示器 -->
        <div v-if="loadingWorks" class="flex justify-center py-8">
          <span class="text-slate-400 text-sm">加载中...</span>
        </div>
      </div>

      <!-- ====== 本人专属：底部菜单组 ====== -->
      <template v-if="isSelf">
        <!-- 菜单组：其他 -->
        <section class="px-4 mt-4">
          <div class="bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100/50">
            <button
              v-for="item in otherMenu"
              :key="item.label"
              class="w-full flex items-center justify-between px-5 py-[14px] hover:bg-slate-50 transition-colors active:scale-[0.99] duration-150 border-b border-slate-100 last:border-0"
              @click="$router.push(item.route)"
            >
              <div class="flex items-center gap-3.5">
                <div
                  class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  :class="item.bgColor"
                >
                  <component :is="item.icon" :size="17" :class="item.color" />
                </div>
                <span class="font-medium text-slate-700">{{ item.label }}</span>
              </div>
              <ChevronRightIcon :size="17" class="text-slate-300" />
            </button>
          </div>
        </section>

        <!-- 退出登录 -->
        <section class="px-4 mt-3 mb-2">
          <div class="bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100/50">
            <button
              class="w-full flex items-center justify-between px-5 py-[14px] hover:bg-red-50 transition-colors active:scale-[0.99] duration-150"
              @click="handleLogout"
            >
              <div class="flex items-center gap-3.5">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-50">
                  <LogOutIcon :size="17" class="text-red-400" />
                </div>
                <span class="font-medium text-red-500">退出登录</span>
              </div>
            </button>
          </div>
        </section>
      </template>

      <!-- ====== 编辑资料弹窗 ====== -->
      <Teleport to="body">
        <div
          v-if="editing"
          class="fixed inset-0 z-[300] flex items-end md:items-center justify-center"
          @click.self="closeEditModal"
        >
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div class="relative w-full md:w-[400px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <!-- 标题栏 -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span class="text-base font-bold text-slate-800">编辑资料</span>
              <button
                class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
                @click="closeEditModal"
              >
                <XIcon :size="14" />
              </button>
            </div>

            <!-- 内容区 -->
            <div class="px-5 py-5 space-y-5">
              <div class="flex flex-col items-center">
                <div class="relative cursor-pointer" @click="pickAvatar">
                  <div class="w-[80px] h-[80px] rounded-full overflow-hidden bg-slate-100 ring-4 ring-slate-50 shadow-inner">
                    <img
                      v-if="editAvatarPreview || profile?.avatar"
                      :src="editAvatarPreview || profile?.avatar"
                      class="w-full h-full object-cover"
                    />
                    <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
                      <UserIcon :size="36" />
                    </div>
                  </div>
                  <div class="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow border-2 border-white">
                    <CameraIcon :size="13" class="text-white" />
                  </div>
                  <input ref="avatarInput" type="file" hidden accept="image/*" @change="onAvatarChange" />
                </div>
                <p class="text-[11px] text-slate-400 mt-2">点击更换头像</p>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1.5">昵称</label>
                <input
                  v-model="editNickname"
                  type="text"
                  maxlength="20"
                  placeholder="请输入昵称"
                  class="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1.5">个性说明</label>
                <textarea
                  v-model="editBio"
                  maxlength="200"
                  rows="3"
                  placeholder="写一句个性说明吧..."
                  class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                />
                <p class="text-[10px] text-slate-400 mt-1 text-right">{{ editBio.length }}/200</p>
              </div>
            </div>

            <div class="px-5 pb-5 pt-1">
              <button
                class="w-full h-12 rounded-full bg-primary text-white font-semibold text-sm active:scale-[0.98] transition-all hover:opacity-90"
                @click="saveProfile"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ====== 粉丝/关注列表弹窗 ====== -->
      <Teleport to="body">
        <div
          v-if="showFollowList"
          class="fixed inset-0 z-[300] flex items-end md:items-center justify-center"
          @click.self="showFollowList = false"
        >
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div class="relative w-full md:w-[420px] max-h-[70vh] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col">
            <!-- 标题 -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <span class="text-base font-bold text-slate-800">
                {{ followListType === 'followers' ? '粉丝' : '关注' }}
              </span>
              <button
                class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
                @click="showFollowList = false"
              >
                <XIcon :size="14" />
              </button>
            </div>
            <!-- 列表 -->
            <div class="overflow-y-auto flex-1">
              <div v-if="followList.length === 0" class="flex flex-col items-center py-12">
                <UserIcon :size="32" class="text-slate-200 mb-2" />
                <p class="text-sm text-slate-400">暂无数据</p>
              </div>
              <div
                v-for="u in followList"
                :key="u.id"
                class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                @click="goToUser(u.id)"
              >
                <img
                  v-if="u.avatar"
                  :src="u.avatar"
                  class="w-10 h-10 rounded-full object-cover"
                />
                <div
                  v-else
                  class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"
                >
                  <UserIcon :size="18" class="text-slate-300" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-slate-800 truncate">{{ u.nickname || u.username }}</p>
                  <p class="text-xs text-slate-400 truncate">{{ u.bio || '' }}</p>
                </div>
                <!-- 互关标识 -->
                <span
                  v-if="u.isMutual"
                  class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium"
                >互相关注</span>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ====== 头像大图预览 ====== -->
      <Teleport to="body">
        <div
          v-if="avatarPreview"
          class="fixed inset-0 z-[400] bg-black/80 flex items-center justify-center cursor-pointer"
          @click="avatarPreview = false"
        >
          <img
            :src="profile?.avatar"
            class="max-w-[80vw] max-h-[80vh] rounded-2xl object-contain"
          />
        </div>
      </Teleport>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UserIcon,
  CameraIcon,
  SettingsIcon,
  XIcon,
  ChevronRightIcon,
  HeartIcon,
  MessageCircleIcon,
  LogOutIcon,
  UserPlusIcon,
  UserCheckIcon,
  ClockIcon,
} from 'lucide-vue-next'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'
import HomeThumbCanvas from '@/components/home/HomeThumbCanvas.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const toast = useToast()

// ====== 核心状态 ======
const profile = ref(null)
const loading = ref(true)
const notFound = ref(false)

const stats = ref({ works: 0, followers: 0, following: 0, totalLikes: 0 })
const loadingStats = ref(false)

const isFollow = ref(false)
const followLoading = ref(false)

const activeTab = ref('works')
const works = ref([])
const loadingWorks = ref(false)
const loadingMore = ref(false)
const worksPage = ref(1)
const hasMore = ref(false)

// ====== 计算属性 ======
const targetUserId = computed(() => {
  return route.params.id ? parseInt(route.params.id) : (auth.user.value?.id || null)
})

const isSelf = computed(() => {
  return auth.user.value && targetUserId.value === auth.user.value.id
})

const tabs = computed(() => {
  if (isSelf.value) {
    return [
      { key: 'works', label: '作品' },
      { key: 'likes', label: '点赞' },
    ]
  }
  return [{ key: 'works', label: '作品' }]
})

const emptyText = computed(() => {
  const map = {
    works: isSelf.value ? '还没有发布作品' : 'TA还没有发布作品',
    likes: '还没有点赞的作品',
  }
  return map[activeTab.value] || '暂无数据'
})

// ====== 响应式瀑布流列数 ======
const columnCount = ref(2)

function updateColumnCount() {
  const w = window.innerWidth
  if (w >= 1600) columnCount.value = 5
  else if (w >= 1200) columnCount.value = 4
  else if (w >= 768) columnCount.value = 3
  else columnCount.value = 2
}

// JS 瀑布流分列（最短列优先）
const columnGroups = computed(() => {
  const n = columnCount.value
  const cols = Array.from({ length: n }, () => [])
  const heights = new Array(n).fill(0)
  for (const item of works.value) {
    const w = item.gridWidth || 1
    const h = item.gridHeight || 1
    const estH = Math.min(h / w, 1.5) + 0.3
    const minIdx = heights.indexOf(Math.min(...heights))
    cols[minIdx].push(item)
    heights[minIdx] += estH
  }
  return cols
})

// 缩略图比例（动态高度）
function thumbRatio(item) {
  const w = item.gridWidth || 1
  const h = item.gridHeight || 1
  if (w && h && w !== h) return `${Math.min((h / w) * 100, 150)}%`
  return '100%'
}

// 数字格式化
function fmtNum(n) {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

// 点赞
async function handleLike(item) {
  if (!auth.isLoggedIn.value) { toast.show('请先登录'); return }
  try {
    const res = await API.post('/api/work/like', { workId: item.id })
    if (res.code === 200) {
      item.isLiked = res.data.liked
      item.likesCount = res.data.likesCount
    }
  } catch (e) { toast.show('操作失败') }
}

// ====== 菜单配置（本人视图） ======
const otherMenu = [
  { label: '更新日志', icon: ClockIcon, color: 'text-blue-500', bgColor: 'bg-blue-50', route: '/changelog' },
  { label: '意见反馈', icon: MessageCircleIcon, color: 'text-blue-400', bgColor: 'bg-blue-50', route: '/feedback' },
]

// ====== 生命周期 ======
onMounted(() => {
  updateColumnCount()
  window.addEventListener('resize', updateColumnCount)
  loadProfile()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateColumnCount)
})

// 路由参数变化时重新加载（从 A 的主页跳到 B 的主页）
watch(() => route.params.id, () => {
  resetState()
  loadProfile()
})

function resetState() {
  profile.value = null
  loading.value = true
  notFound.value = false
  stats.value = { works: 0, followers: 0, following: 0, totalLikes: 0 }
  isFollow.value = false
  activeTab.value = 'works'
  works.value = []
  worksPage.value = 1
  hasMore.value = false
}

// ====== 数据加载 ======
async function loadProfile() {
  const uid = targetUserId.value
  if (!uid) {
    loading.value = false
    notFound.value = true
    return
  }

  loading.value = true
  try {
    const res = await API.get('/api/user/profile/' + uid, false)
    if (res.code !== 200) throw new Error(res.message)

    const data = res.data
    profile.value = data.user
    stats.value = data.stats
    isFollow.value = data.isFollow

    // 直接使用首屏作品数据
    works.value = data.works.list || []
    hasMore.value = data.works.hasMore || false
    worksPage.value = 1
  } catch (e) {
    console.error('加载用户主页失败:', e)
    notFound.value = true
  }
  loading.value = false
  loadingStats.value = false
}

async function loadMoreWorks() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true

  try {
    const uid = targetUserId.value
    const page = worksPage.value + 1

    const res = await API.get(
      `/api/user/${uid}/works?page=${page}&limit=12&sort=latest`,
      false
    )
    if (res.code === 200) {
      works.value.push(...(res.data.list || []))
      hasMore.value = res.data.hasMore
      worksPage.value = page
    }
  } catch (e) {
    console.error('加载更多作品失败:', e)
  }
  loadingMore.value = false
}

// ====== Tab 切换 ======
async function switchTab(key) {
  if (activeTab.value === key) return
  activeTab.value = key

  if (key === 'works') {
    // 重新加载作品列表
    worksPage.value = 1
    works.value = []
    loadingWorks.value = true
    hasMore.value = false

    try {
      const uid = targetUserId.value
      const res = await API.get(`/api/user/${uid}/works?page=1&limit=12`, false)
      if (res.code === 200) {
        works.value = res.data.list || []
        hasMore.value = res.data.hasMore
      }
    } catch (e) {
      console.error('加载作品失败:', e)
    }
    loadingWorks.value = false
  } else if (key === 'likes') {
    loadingWorks.value = true
    try {
      const res = await API.get('/api/user/likes?page=1&limit=20')
      works.value = (res.data?.list || []).map(d => ({
        ...d,
        isLiked: true,
      }))
      hasMore.value = res.data?.list?.length >= (res.data?.limit || 20)
    } catch { /* ignore */ }
    loadingWorks.value = false
  }
}

// ====== 关注/取消关注 ======
async function handleFollow() {
  if (!auth.isLoggedIn.value) {
    toast.show('请先登录')
    router.push('/login')
    return
  }

  if (followLoading.value) return
  followLoading.value = true

  try {
    const res = await API.post('/api/user/follow', { targetUid: targetUserId.value })
    if (res.code === 200) {
      isFollow.value = res.data.isFollow
      stats.value.followers += res.data.isFollow ? 1 : -1
      toast.show(res.data.isFollow ? '已关注' : '已取消关注')
    }
  } catch (e) {
    toast.show(e.message || '操作失败')
  }
  followLoading.value = false
}

// ====== 粉丝/关注列表 ======
const showFollowList = ref(false)
const followListType = ref('followers')
const followList = ref([])

async function openFollowersList() {
  followListType.value = 'followers'
  showFollowList.value = true
  followList.value = []
  try {
    const res = await API.get(`/api/user/${targetUserId.value}/followers?limit=50`, false)
    if (res.code === 200) followList.value = res.data.list || []
  } catch { /* ignore */ }
}

async function openFollowingList() {
  followListType.value = 'following'
  showFollowList.value = true
  followList.value = []
  try {
    const res = await API.get(`/api/user/${targetUserId.value}/following?limit=50`, false)
    if (res.code === 200) followList.value = res.data.list || []
  } catch { /* ignore */ }
}

function goToUser(uid) {
  showFollowList.value = false
  router.push('/user/' + uid)
}

// ====== 头像预览 ======
const avatarPreview = ref(false)
function previewAvatar() {
  if (profile.value?.avatar) avatarPreview.value = true
}

// ====== 编辑资料（复用现有逻辑） ======
const avatarInput = ref(null)
const editing = ref(false)
const editNickname = ref('')
const editBio = ref('')
const editAvatarFile = ref(null)
const editAvatarPreview = ref('')

function openEditModal() {
  editNickname.value = profile.value?.nickname || ''
  editBio.value = profile.value?.bio || ''
  editAvatarFile.value = null
  editAvatarPreview.value = ''
  editing.value = true
}

function closeEditModal() {
  editing.value = false
  editAvatarFile.value = null
  editAvatarPreview.value = ''
}

function pickAvatar() {
  avatarInput.value?.click()
}

function onAvatarChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    toast.show('图片不能超过5MB')
    return
  }
  editAvatarFile.value = file
  const reader = new FileReader()
  reader.onload = (ev) => { editAvatarPreview.value = ev.target.result }
  reader.readAsDataURL(file)
}

async function saveProfile() {
  const nickname = editNickname.value.trim()
  if (!nickname) { toast.show('昵称不能为空'); return }

  const fd = new FormData()
  fd.append('nickname', nickname)
  fd.append('bio', editBio.value || '')
  if (editAvatarFile.value) fd.append('avatar', editAvatarFile.value)

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + auth.token.value },
      body: fd,
    })
    const data = await res.json()
    if (data.code !== 200) throw new Error(data.message)

    const updatedUser = data.data
    auth.user.value = updatedUser
    localStorage.setItem('douding_user', JSON.stringify(updatedUser))

    if (profile.value && profile.value.id === updatedUser.id) {
      profile.value = {
        ...profile.value,
        nickname: updatedUser.nickname,
        bio: updatedUser.bio,
        avatar: updatedUser.avatar ? updatedUser.avatar + '?v=' + Date.now() : null,
      }
    }

    editing.value = false
    toast.show('资料已更新')
  } catch (e) {
    toast.show(e.message)
  }
}

// ====== 退出登录 ======
function handleLogout() {
  auth.logout()
  router.push('/')
  toast.show('已退出登录')
}

// ====== 工具函数 ======
function formatNum(n) {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}
</script>

<style>
/* ===== 瀑布流卡片（首页同款） ===== */
.masonry-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s;
}
.masonry-card:active { transform: scale(0.98); }
@media (hover: hover) {
  .masonry-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-slide-up {
  animation: slide-up 0.25s ease-out;
}
@media (min-width: 768px) {
  @keyframes slide-up-md {
    from { transform: translateY(20px) scale(0.96); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
  }
  .animate-slide-up {
    animation: slide-up-md 0.2s ease-out;
  }
}
</style>
