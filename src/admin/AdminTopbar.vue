<!-- ============================================
  AdminTopbar.vue — 管理端顶部全局栏
============================================ -->
<template>
  <div class="admin-topbar">
    <!-- 左侧：折叠按钮 + 面包屑 -->
    <div class="topbar-left">
      <el-button text @click="$emit('toggleSidebar')">
        <el-icon :size="20"><component :is="Fold" /></el-icon>
      </el-button>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/admin/dashboard' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item v-if="breadcrumbTitle">{{ breadcrumbTitle }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 右侧：管理员信息 -->
    <div class="topbar-right">
      <el-dropdown trigger="click" @command="handleCommand">
        <span class="admin-avatar">
          <el-avatar :size="32" icon="UserFilled" />
          <span class="admin-name">{{ adminName }}</span>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">个人资料</el-dropdown-item>
            <el-dropdown-item command="password">修改密码</el-dropdown-item>
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Fold, ArrowDown } from '@element-plus/icons-vue'
import { useAdminAuth } from './composables/useAdminAuth.js'
import { ElMessage } from 'element-plus'

defineEmits(['toggleSidebar'])

const router = useRouter()
const route = useRoute()
const { admin, logout } = useAdminAuth()

const adminName = computed(() => admin.value?.nickname || admin.value?.username || '管理员')

// 面包屑
const breadcrumbMap = {
  dashboard: '数据看板',
  users: '用户管理',
  templates: '模板管理',
  'bead-colors': '色号管理',
  banners: 'Banner 管理',
  admins: '权限管理',
  roles: '角色管理',
  logs: '操作日志',
}
const breadcrumbTitle = computed(() => {
  const firstPath = route.path.split('/')[2]
  return breadcrumbMap[firstPath] || ''
})

function handleCommand(cmd) {
  if (cmd === 'logout') {
    logout()
    router.push({ name: 'adminLogin' })
    ElMessage.success('已退出登录')
  } else if (cmd === 'password') {
    // TODO: 修改密码弹窗
    ElMessage.info('修改密码功能开发中')
  }
}
</script>

<style scoped>
.admin-topbar {
  height: 60px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar-right {
  display: flex;
  align-items: center;
}

.admin-avatar {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #333;
}

.admin-name {
  font-size: 14px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
