<!-- ============================================
  WarehouseView.vue — 我的仓库（文件夹 + 设计列表）
============================================ -->
<template>
  <div class="flex h-full" v-if="auth.isLoggedIn.value">
    <!-- 文件夹侧边栏 -->
    <aside class="w-[200px] min-w-[200px] bg-white border-r border-slate-100 p-3 overflow-y-auto max-md:hidden">
      <h3 class="text-[11px] uppercase tracking-wide text-slate-400 mb-2 font-semibold">📁 文件夹</h3>
      <ul class="space-y-0.5">
        <li class="folder-item" :class="{ active: currentFolder === '' }" @click="switchFolder('')">
          📋 全部
        </li>
        <li v-for="f in folders" :key="f.id" class="folder-item" :class="{ active: currentFolder == f.id }"
          @click="switchFolder(String(f.id))">
          📁 {{ f.name }}
          <span class="text-[10px] text-slate-400 ml-auto">{{ f.design_count || 0 }}</span>
        </li>
      </ul>
      <button class="w-full mt-2 h-8 text-[11px] text-slate-500 rounded-lg hover:bg-slate-50 transition-colors"
        @click="newFolder">+ 新建文件夹</button>
    </aside>
    <!-- 设计列表 -->
    <div class="flex-1 overflow-y-auto p-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">我的图纸</h2>
      </div>
      <div v-if="designs.length" class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        <DesignCard v-for="d in designs" :key="d.id" :design="d" />
      </div>
      <div v-else class="text-center py-16 text-slate-400">
        <div class="text-5xl mb-3">📭</div>
        <p class="text-sm mb-4">还没有图纸，去创作一个吧！</p>
        <button class="btn-primary" @click="$router.push('/editor')">开始创作</button>
      </div>
    </div>
  </div>
  <div v-else class="flex items-center justify-center h-full text-slate-400">请先登录</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'
import { useDialog } from '@/composables/useDialog.js'
import DesignCard from '@/components/DesignCard.vue'

const router = useRouter()
const auth = useAuth()
const toast = useToast()
const dialog = useDialog()

const folders = ref([])
const designs = ref([])
const currentFolder = ref('')

onMounted(() => { if (auth.isLoggedIn.value) fetchAll() })

function switchFolder(id) {
  currentFolder.value = id
  fetchDesigns()
}

async function fetchAll() {
  try {
    const [fRes, dRes] = await Promise.all([
      API.get('/api/folders'),
      API.get('/api/designs' + (currentFolder.value ? '?folder_id=' + currentFolder.value : ''))
    ])
    folders.value = fRes.data || []
    designs.value = (dRes.data?.list) || []
  } catch (e) { toast.show(e.message) }
}

async function fetchDesigns() {
  try {
    const url = '/api/designs' + (currentFolder.value ? '?folder_id=' + currentFolder.value : '')
    const res = await API.get(url)
    designs.value = res.data?.list || []
  } catch (e) { toast.show(e.message) }
}

async function newFolder() {
  const name = await dialog.prompt('请输入文件夹名称', '新建文件夹', '', '文件夹名称')
  if (!name) return
  try { await API.post('/api/folders', { name }); fetchAll() }
  catch (e) { toast.show(e.message) }
}
</script>

<style scoped>
.folder-item {
  @apply px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-500 cursor-pointer
         flex items-center gap-1.5 transition-all duration-100;
}
.folder-item:hover { @apply bg-slate-50; }
.folder-item.active { @apply bg-primary-lighter text-primary; }
.btn-primary {
  @apply inline-flex items-center h-9 px-4 rounded-full text-[13px] font-semibold
         bg-primary text-white border-none transition-all duration-150;
}
.btn-primary:hover { @apply bg-primary-dark; }
</style>
