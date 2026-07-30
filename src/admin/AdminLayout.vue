<!-- ============================================
  AdminLayout.vue — 管理端标准三栏布局
============================================ -->
<template>
  <div class="admin-layout">
    <!-- 左侧导航 -->
    <AdminSidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />

    <!-- 右侧主体 -->
    <div class="admin-main" :class="{ collapsed: sidebarCollapsed }">
      <!-- 顶部栏 -->
      <AdminTopbar @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed" />

      <!-- 主内容区（居中） -->
      <div class="admin-content">
        <div class="admin-content-inner">
          <router-view />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AdminSidebar from './AdminSidebar.vue'
import AdminTopbar from './AdminTopbar.vue'

const sidebarCollapsed = ref(false)
</script>

<style scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  background: #f0f2f5;
}

.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 220px;
  min-width: 0;
  transition: margin-left 0.3s;
}

.admin-main.collapsed {
  margin-left: 64px;
}

.admin-content {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
}

.admin-content-inner {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}
</style>
