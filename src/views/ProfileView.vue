<!-- ============================================
  ProfileView.vue — 我的（参考 dmao.cloud/profile 设计）
============================================ -->
<template>
  <div class="overflow-y-auto h-full pb-8">
    <!-- ===== 已登录 ===== -->
    <template v-if="auth.isLoggedIn.value && profile">
      <!-- 用户信息卡片 -->
      <section
        class="mx-4 mt-4 bg-white rounded-[1.5rem] shadow-sm border border-slate-100/50 overflow-hidden"
      >
        <div class="flex items-center gap-4 px-5 pt-5 pb-4">
          <!-- 头像 -->
          <div
            class="relative flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
            @click="goEditProfile"
          >
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
            <div
              class="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow border-2 border-white"
            >
              <PencilIcon :size="10" class="text-white" />
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

          <!-- 设置按钮 -->
          <button
            class="flex-shrink-0 w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-90 transition-all"
            @click="goEditProfile"
          >
            <SettingsIcon :size="18" />
          </button>
        </div>

        <!-- 统计行 -->
        <div class="flex border-t border-slate-100 mx-1">
          <div
            class="flex-1 flex flex-col items-center py-3 cursor-pointer active:bg-slate-50/80 transition-colors"
            @click="$router.push('/warehouse')"
          >
            <span class="text-[17px] font-bold text-primary leading-tight">
              {{ loadingStats ? '...' : formatNum(stats.works) }}
            </span>
            <span class="text-[11px] text-slate-400 mt-0.5">作品</span>
          </div>
          <div class="w-px bg-slate-100 my-2.5" />
          <div
            class="flex-1 flex flex-col items-center py-3 active:bg-slate-50/80 transition-colors"
          >
            <span class="text-[17px] font-bold text-primary leading-tight">
              {{ loadingStats ? '...' : formatNum(stats.likes) }}
            </span>
            <span class="text-[11px] text-slate-400 mt-0.5">获赞</span>
          </div>
          <div class="w-px bg-slate-100 my-2.5" />
          <div
            class="flex-1 flex flex-col items-center py-3 active:bg-slate-50/80 transition-colors"
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
              {{ loadingStats ? '...' : formatNum(stats.followers) }}
            </span>
            <span class="text-[11px] text-slate-400 mt-0.5">粉丝</span>
          </div>
        </div>

        <!-- VIP 横幅 -->
        <div class="px-4 pb-4">
          <div
            class="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left bg-primary text-white shadow-lg shadow-primary/15 active:scale-[0.99] transition-all cursor-pointer"
            @click="toast.show('VIP 功能即将上线')"
          >
            <div
              class="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white/15 text-white"
            >
              <CrownIcon :size="21" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-white">开通 VIP</p>
              <p class="text-xs mt-0.5 truncate text-white/80">解锁识别、多仓库等高级权益</p>
            </div>
            <ChevronRightIcon :size="18" class="text-white/80" />
          </div>
        </div>
      </section>

      <!-- 菜单组一：我的服务 -->
      <section class="px-4 mt-3">
        <div class="bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100/50">
          <button
            v-for="item in serviceMenu"
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
              <span
                v-if="item.badge"
                class="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                :class="item.badgeClass"
                >{{ item.badge }}</span
              >
            </div>
            <ChevronRightIcon :size="17" class="text-slate-300" />
          </button>
        </div>
      </section>

      <!-- 菜单组二：其他 -->
      <section class="px-4 mt-3">
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
              <span
                v-if="item.badge"
                class="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                :class="item.badgeClass"
                >{{ item.badge }}</span
              >
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
              <div
                class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-50"
              >
                <LogOutIcon :size="17" class="text-red-400" />
              </div>
              <span class="font-medium text-red-500">退出登录</span>
            </div>
          </button>
        </div>
      </section>
    </template>

    <!-- ===== 未登录 ===== -->
    <div v-else-if="!loading" class="flex flex-col items-center py-16 px-6">
      <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <UserIcon :size="32" class="text-slate-300" />
      </div>
      <h1 class="text-lg font-bold text-slate-900">未登录</h1>
      <p class="text-slate-400 text-sm mt-1">登录后开启您的像素艺术之旅</p>
      <button
        class="mt-6 px-10 py-3 bg-primary text-white rounded-full font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
        @click="$router.push('/login')"
      >
        <LogInIcon :size="16" />
        <span>立即登录</span>
      </button>
    </div>

    <!-- 加载中 -->
    <div v-else class="flex items-center justify-center py-32">
      <span class="text-slate-400 text-sm">加载中...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UserIcon,
  PencilIcon,
  SettingsIcon,
  CrownIcon,
  ChevronRightIcon,
  HeartIcon,
  PackageIcon,
  BookIcon,
  ClockIcon,
  MessageCircleIcon,
  InfoIcon,
  LogOutIcon,
  LogInIcon,
} from 'lucide-vue-next'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'
import { useDialog } from '@/composables/useDialog.js'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const toast = useToast()
const dialog = useDialog()

const profile = ref(null)
const loading = ref(true)
const loadingStats = ref(false)
const stats = ref({ works: 0, likes: 0, following: 0, followers: 0 })

const serviceMenu = [
  {
    label: '我的喜欢',
    icon: HeartIcon,
    color: 'text-red-400',
    bgColor: 'bg-red-50',
    route: '/likes',
  },
  {
    label: '豆子仓库',
    icon: PackageIcon,
    color: 'text-violet-500',
    bgColor: 'bg-violet-50',
    route: '/warehouse',
    badge: 'NEW',
    badgeClass: 'bg-violet-500 text-white',
  },
]

const otherMenu = [
  {
    label: '使用教程',
    icon: BookIcon,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    route: '/tutorial',
  },
  {
    label: '更新日志',
    icon: ClockIcon,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    route: '/changelog',
  },
  {
    label: '意见反馈',
    icon: MessageCircleIcon,
    color: 'text-blue-400',
    bgColor: 'bg-blue-50',
    route: '/feedback',
    badge: '💬 说说你的想法',
    badgeClass: 'bg-orange-50 text-orange-500 border border-orange-200',
  },
  {
    label: '关于我们',
    icon: InfoIcon,
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
    route: '/about',
  },
]

const isOwner = computed(
  () => auth.user.value && profile.value && auth.user.value.id === profile.value.id
)

onMounted(async () => {
  if (!auth.isLoggedIn.value) {
    loading.value = false
    return
  }

  const userId = route.params.id || auth.user.value?.id
  if (!userId) {
    loading.value = false
    return
  }

  try {
    const res = await API.get('/api/user/' + userId, true)
    profile.value = res.data
  } catch {
    /* ignore */
  }
  loading.value = false
  loadStats()
})

async function loadStats() {
  loadingStats.value = true
  try {
    // 获取作品数
    const dRes = await API.get('/api/designs?limit=1')
    stats.value.works = dRes.data?.total || 0
    // 获赞：统计所有作品点赞
    stats.value.likes = profile.value?.designs?.reduce((s, d) => s + (d.likesCount || 0), 0) || 0
  } catch {
    /* ignore */
  }
  loadingStats.value = false
}

async function goEditProfile() {
  const nickname = await dialog.prompt(
    '请输入新昵称',
    '编辑资料',
    profile.value?.nickname || '',
    '昵称'
  )
  if (nickname === null) return
  const bio = await dialog.prompt('请输入个人简介', '编辑资料', profile.value?.bio || '', '简介')
  if (bio !== null) {
    API.put('/api/auth/profile', { nickname, bio })
      .then(() => {
        auth.user.value = { ...auth.user.value, nickname, bio }
        localStorage.setItem('douding_user', JSON.stringify(auth.user.value))
        if (profile.value) {
          profile.value.nickname = nickname
          profile.value.bio = bio
        }
        toast.show('资料已更新')
      })
      .catch((e) => toast.show(e.message))
  }
}

function handleLogout() {
  auth.logout()
  router.push('/')
  toast.show('已退出登录')
}

function formatNum(n) {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}
</script>
