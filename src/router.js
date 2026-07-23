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
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
