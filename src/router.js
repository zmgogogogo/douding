// ============================================
//  Vue Router — 基于 hash 的单页路由
// ============================================
import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
  { path: '/editor', name: 'editor', component: () => import('./views/EditorView.vue') },
  { path: '/editor/:id', name: 'editorEdit', component: () => import('./views/EditorView.vue') },
  {
    path: '/image-import',
    name: 'imageImport',
    component: () => import('./views/ImageImportView.vue'),
  },
  { path: '/detail/:id', name: 'detail', component: () => import('./views/DetailView.vue') },
  { path: '/login', name: 'login', component: () => import('./views/AuthView.vue') },
  { path: '/warehouse', name: 'warehouse', component: () => import('./views/WarehouseView.vue') },
  { path: '/user/:id', name: 'profile', component: () => import('./views/ProfileView.vue') },
  { path: '/search', name: 'search', component: () => import('./views/SearchView.vue') },
  { path: '/ocr', name: 'ocr', component: () => import('./views/OcrView.vue') },
  {
    path: '/link-import',
    name: 'linkImport',
    component: () => import('./views/LinkImportView.vue'),
  },
  // 占位路由（ProfileView 等页面引用的路径，功能待实现）
  { path: '/likes', name: 'likes', component: () => import('./views/LikedDesignsView.vue') },
  { path: '/favorites', name: 'favorites', component: () => import('./views/FavoriteDesignsView.vue') },
  { path: '/make/:id', name: 'make', component: () => import('./views/MakeModeView.vue') },
  { path: '/make-records', name: 'makeRecords', component: () => import('./views/MakeRecordsView.vue') },
  { path: '/tutorial', name: 'tutorial', component: () => import('./views/PlaceholderView.vue') },
  { path: '/changelog', name: 'changelog', component: () => import('./views/PlaceholderView.vue') },
  { path: '/feedback', name: 'feedback', component: () => import('./views/PlaceholderView.vue') },
  { path: '/about', name: 'about', component: () => import('./views/PlaceholderView.vue') },
  { path: '/messages', name: 'messages', component: () => import('./views/PlaceholderView.vue') },
  // 404 兜底路由
  { path: '/:pathMatch(.*)*', name: 'notFound', component: () => import('./views/NotFoundView.vue') },

  // ===== 管理后台路由 =====
  {
    path: '/admin/login',
    name: 'adminLogin',
    component: () => import('./admin/views/LoginView.vue'),
  },
  {
    path: '/admin',
    component: () => import('./admin/AdminLayout.vue'),
    meta: { requiresAdmin: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      {
        path: 'dashboard',
        name: 'adminDashboard',
        component: () => import('./admin/views/DashboardView.vue'),
      },
      {
        path: 'users',
        name: 'adminUsers',
        component: () => import('./admin/views/UserListView.vue'),
      },
      {
        path: 'users/:id',
        name: 'adminUserDetail',
        component: () => import('./admin/views/UserDetailView.vue'),
      },
      {
        path: 'templates',
        name: 'adminTemplates',
        component: () => import('./admin/views/TemplateListView.vue'),
      },
      {
        path: 'templates/new',
        name: 'adminTemplateNew',
        component: () => import('./admin/views/TemplateEditView.vue'),
      },
      {
        path: 'templates/:id',
        name: 'adminTemplateEdit',
        component: () => import('./admin/views/TemplateEditView.vue'),
      },
      {
        path: 'bead-colors',
        name: 'adminBeadColors',
        component: () => import('./admin/views/BeadColorListView.vue'),
      },
      {
        path: 'banners',
        name: 'adminBanners',
        component: () => import('./admin/views/BannerListView.vue'),
      },
      {
        path: 'banners/new',
        name: 'adminBannerNew',
        component: () => import('./admin/views/BannerEditView.vue'),
      },
      {
        path: 'banners/:id',
        name: 'adminBannerEdit',
        component: () => import('./admin/views/BannerEditView.vue'),
      },
      {
        path: 'admins',
        name: 'adminAdmins',
        component: () => import('./admin/views/AdminListView.vue'),
      },
      {
        path: 'roles',
        name: 'adminRoles',
        component: () => import('./admin/views/RoleListView.vue'),
      },
      {
        path: 'logs',
        name: 'adminLogs',
        component: () => import('./admin/views/LogListView.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// 路由守卫 — 管理端认证检查
router.beforeEach((to, from, next) => {
  // 管理端路由需要认证
  if (to.meta.requiresAdmin) {
    const adminToken = localStorage.getItem('douding_admin_token')
    if (!adminToken) {
      return next({ name: 'adminLogin', query: { redirect: to.fullPath } })
    }
  }
  // 已登录管理员访问登录页，直接跳转看板
  if (to.name === 'adminLogin') {
    const adminToken = localStorage.getItem('douding_admin_token')
    if (adminToken) return next({ name: 'adminDashboard' })
  }
  next()
})

export default router
