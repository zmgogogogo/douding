<!-- ============================================
  AdminSidebar.vue — 管理端左侧导航菜单
  支持折叠/展开，220px ↔ 64px
============================================ -->
<template>
  <div class="admin-sidebar" :class="{ collapsed }">
    <!-- Logo 区 -->
    <div class="sidebar-logo">
      <span v-if="!collapsed" class="logo-text">🧩 豆丁后台</span>
      <span v-else class="logo-icon">🧩</span>
    </div>

    <!-- 菜单 -->
    <el-menu
      :default-active="activeMenu"
      :collapse="collapsed"
      :router="true"
      class="sidebar-menu"
      background-color="#001529"
      text-color="#ffffffb3"
      active-text-color="#ffffff"
    >
      <el-menu-item index="/admin/dashboard">
        <el-icon><DataAnalysis /></el-icon>
        <template #title>数据看板</template>
      </el-menu-item>

      <el-menu-item index="/admin/users">
        <el-icon><User /></el-icon>
        <template #title>用户管理</template>
      </el-menu-item>

      <el-sub-menu index="content">
        <template #title>
          <el-icon><Document /></el-icon>
          <span>内容管理</span>
        </template>
        <el-menu-item index="/admin/templates">模板管理</el-menu-item>
      </el-sub-menu>

      <el-sub-menu index="palette">
        <template #title>
          <el-icon><Brush /></el-icon>
          <span>色板物料</span>
        </template>
        <el-menu-item index="/admin/bead-colors">色号管理</el-menu-item>
      </el-sub-menu>

      <el-sub-menu index="operations">
        <template #title>
          <el-icon><Promotion /></el-icon>
          <span>运营管理</span>
        </template>
        <el-menu-item index="/admin/banners">Banner 管理</el-menu-item>
      </el-sub-menu>

      <el-menu-item index="/admin/admins">
        <el-icon><Setting /></el-icon>
        <template #title>权限管理</template>
      </el-menu-item>

      <el-menu-item index="/admin/logs">
        <el-icon><Tickets /></el-icon>
        <template #title>操作日志</template>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  DataAnalysis, User, Document, Brush, Promotion, Setting, Tickets,
} from '@element-plus/icons-vue'

defineProps({
  collapsed: { type: Boolean, default: false },
})

defineEmits(['toggle'])

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.admin-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 220px;
  background: #001529;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 1001;
  transition: width 0.3s;
}

.admin-sidebar.collapsed {
  width: 64px;
}

.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.logo-text {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

.logo-icon {
  font-size: 20px;
}

.sidebar-menu {
  border-right: none;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 220px;
}
</style>
