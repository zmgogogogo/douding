<!-- ============================================
  DetailView.vue — 作品详情页（全新布局）
  文档参考: .claude/作品详情.md
  五大模块：顶部导航栏 / 左侧预览区 / 右侧信息区 / 底部操作栏
============================================ -->
<template>
  <div class="overflow-y-auto h-full bg-[#f7f8fa]">
    <!-- ====== 加载中 ====== -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="text-slate-400 text-sm">加载中...</div>
    </div>

    <!-- ====== 错误 ====== -->
    <div v-else-if="error" class="flex flex-col items-center justify-center h-64 gap-3">
      <p class="text-slate-400 text-sm">{{ error }}</p>
      <button
        class="px-4 py-2 text-xs font-medium bg-white border border-slate-200 rounded-full
               hover:bg-slate-50 transition-all duration-150"
        @click="fetchDetail"
      >重新加载</button>
    </div>

    <!-- ====== 主体内容 ====== -->
    <div v-else-if="work">
      <div class="max-w-[1100px] mx-auto px-4 py-4">

        <!-- ============================================================
          模块一：顶部导航栏 — 作者信息 + 关注/分享
        ============================================================ -->
        <div class="flex items-center justify-between h-[60px] mb-4 px-4 bg-white rounded-2xl
                    shadow-[0_1px_3px_rgba(0,0,0,.04)]">

          <!-- 左侧：作者信息 -->
          <div class="flex items-center gap-3 cursor-pointer" @click="$router.push(`/user/${work.author.id}`)">
            <div class="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
              <img
                v-if="work.author.avatar"
                :src="work.author.avatar"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                {{ (work.author.nickname || '?')[0] }}
              </div>
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-800">{{ work.author.nickname }}</p>
              <p class="text-[11px] text-slate-400">{{ work.author.fansCount || 0 }} 粉丝</p>
            </div>
          </div>

          <!-- 右侧：关注 + 分享 -->
          <div class="flex items-center gap-2">
            <button
              v-if="auth.isLoggedIn.value && work.author.id !== auth.user?.value?.id"
              class="h-8 px-4 text-xs font-medium rounded-full transition-all duration-150 active:scale-95"
              :class="work.author.isFollow
                ? 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                : 'bg-primary text-white hover:bg-primary/90'"
              @click="toggleFollow"
            >
              {{ work.author.isFollow ? '已关注' : '关注' }}
            </button>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-full
                     text-slate-400 hover:text-slate-600 hover:bg-slate-100
                     transition-all duration-150"
              @click="showShare = true"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- ============================================================
          模块二+三：左右分区
        ============================================================ -->
        <div class="flex gap-[30px] max-lg:flex-col max-lg:gap-4">

          <!-- ====== 左侧：作品预览区 ====== -->
          <div class="flex-shrink-0 w-full max-w-[580px]">
            <div class="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,.04)]">
              <!-- 预览图 -->
              <div class="relative bg-slate-100 flex items-center justify-center" style="min-height: 400px;">
                <canvas
                  ref="previewCanvas"
                  width="200"
                  height="200"
                  class="max-w-full max-h-[500px] pixel-thumb cursor-zoom-in"
                  style="min-width: 100px; min-height: 100px;"
                  @click="showZoom = true"
                />
                <!-- 放大按钮 -->
                <button
                  class="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full
                         flex items-center justify-center shadow-sm text-slate-500
                         hover:text-slate-700 hover:bg-white transition-all duration-150"
                  @click="showZoom = true"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </button>
              </div>

              <!-- 标签 -->
              <div v-if="tags.length > 0" class="flex flex-wrap gap-1.5 px-4 py-3">
                <span
                  v-for="tag in tags"
                  :key="tag"
                  class="px-2.5 py-1 text-[11px] text-slate-500 bg-slate-50 rounded-full
                         cursor-pointer hover:bg-slate-100 transition-all duration-150"
                  @click="$router.push(`/search?q=${tag}`)"
                >{{ tag }}</span>
              </div>
            </div>
          </div>

          <!-- ====== 右侧：作品信息区 ====== -->
          <div class="flex-1 min-w-0 flex flex-col gap-4">

            <!-- 3.1 标题与版权 -->
            <div class="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
              <div class="flex items-center gap-2 mb-1">
                <h1 class="text-lg font-bold text-slate-800">{{ work.title }}</h1>
                <span
                  v-if="work.isRemix"
                  class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600
                         border border-amber-200 cursor-help"
                  title="该作品基于他人原作二次创作"
                >二创</span>
              </div>
              <p v-if="work.copyrightDesc" class="text-[12px] text-slate-400 mb-2">
                {{ work.copyrightDesc }}
              </p>
              <div class="flex items-center gap-3 text-[11px] text-slate-400">
                <span
                  class="cursor-help"
                  :title="'发布于 ' + fullTimeStr"
                >{{ formatTime(work.publishedAt || work.createdAt) }}</span>
                <span>👁 {{ formatCount(work.viewsCount + 1) }} 次浏览</span>
              </div>
            </div>

            <!-- 3.2 拼豆核心参数四卡片 -->
            <div class="grid grid-cols-4 gap-2 max-sm:grid-cols-2">
              <!-- 格数 -->
              <div class="bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,.04)]">
                <div class="text-lg mb-1">📐</div>
                <p class="text-sm font-semibold text-slate-700">{{ work.baseParam.gridSize }}</p>
                <p class="text-[10px] text-slate-400">格数</p>
              </div>
              <!-- 难度 -->
              <div class="bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,.04)]">
                <div class="text-lg mb-1">⚡</div>
                <p class="text-sm font-semibold" :class="difficultyColor">{{ work.baseParam.difficultyText }}</p>
                <p class="text-[10px] text-slate-400">难度</p>
              </div>
              <!-- 耗时 -->
              <div class="bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,.04)]">
                <div class="text-lg mb-1">⏱️</div>
                <p class="text-sm font-semibold text-slate-700">{{ work.baseParam.costTime || '-' }}</p>
                <p class="text-[10px] text-slate-400">预估耗时</p>
              </div>
              <!-- 尺寸 -->
              <div class="bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,.04)]">
                <div class="text-lg mb-1">📏</div>
                <p class="text-sm font-semibold text-slate-700">{{ work.baseParam.realSize || '-' }}</p>
                <p class="text-[10px] text-slate-400">成品尺寸</p>
              </div>
            </div>

            <!-- 3.3 豆子用料清单 -->
            <div class="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold text-slate-800">豆子清单</h3>
                <button
                  class="h-7 px-3 text-[11px] font-medium rounded-full transition-all duration-150 active:scale-95
                         bg-blue-50 text-primary border border-blue-100 hover:bg-blue-100"
                  @click="checkStock"
                >
                  🔍 检测库存
                </button>
              </div>

              <!-- 统计文案 -->
              <p class="text-[11px] text-slate-400 mb-2.5">
                <template v-if="work.beanInfo.seriesName">色系：{{ work.beanInfo.seriesName }} · </template>
                总计 <b class="text-slate-600">{{ work.beanInfo.totalColorType }}</b> 种颜色 ·
                合计 <b class="text-slate-600">{{ work.beanInfo.totalBeanNum.toLocaleString() }}</b> 颗豆子
              </p>

              <!-- 色卡网格 -->
              <div class="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
                <div
                  v-for="(bean, i) in work.beanInfo.colorList"
                  :key="i"
                  class="flex items-center gap-1.5 bg-slate-50 rounded-lg pl-1 pr-2 py-1
                         cursor-pointer hover:scale-105 hover:shadow-sm hover:border-primary/30
                         border border-transparent transition-all duration-150"
                  :title="`${bean.colorCode}: ${bean.needNum.toLocaleString()} 颗`"
                >
                  <span
                    class="w-[20px] h-[20px] rounded-md flex-shrink-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]"
                    :style="{ background: bean.colorHex }"
                  />
                  <span class="text-[10px] text-slate-600 font-medium">{{ bean.colorCode }}</span>
                  <span class="text-[10px] text-slate-400">×{{ bean.needNum }}</span>
                </div>
              </div>
            </div>

            <!-- 3.4 评论区 -->
            <div class="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
              <DetailCommentSection
                :work-id="work.id"
                :author-id="work.author.id"
                @require-login="requireLogin"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================================
        模块四：底部全局操作栏（固定）
      ============================================================ -->
      <div class="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-100
                  shadow-[0_-2px_12px_rgba(0,0,0,.06)] mt-4">
        <div class="max-w-[1100px] mx-auto px-4 h-14 flex items-center justify-between">
          <!-- 点赞 -->
          <button
            class="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all duration-150 active:scale-90"
            :class="work.isLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-400'"
            @click="toggleLike"
          >
            <span class="text-xl">{{ work.isLiked ? '❤️' : '🤍' }}</span>
            <span class="text-sm font-semibold">{{ work.likesCount }}</span>
          </button>

          <!-- 导出图纸按钮 -->
          <button
            class="h-9 px-5 text-xs font-semibold rounded-full transition-all duration-150 active:scale-95"
            :class="(work.isLiked || isOwnWork)
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
            @click="handleDownloadAction"
          >
            {{ (work.isLiked || isOwnWork) ? '📥 导出图纸' : '❤️ 点赞后可获取图纸' }}
          </button>
        </div>
      </div>

      <!-- ====== 库存检测弹窗 ====== -->
      <Teleport to="body">
        <div
          v-if="showStockCheck"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          @click.self="showStockCheck = false"
        >
          <div class="bg-white rounded-2xl w-[420px] max-w-[90vw] max-h-[70vh] overflow-hidden shadow-xl">
            <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h3 class="text-sm font-semibold text-slate-800">库存检测结果</h3>
              <button
                class="w-7 h-7 flex items-center justify-center rounded-full text-slate-400
                       hover:text-slate-600 hover:bg-slate-100 transition-all duration-150"
                @click="showStockCheck = false"
              >✕</button>
            </div>
            <div class="p-4 overflow-y-auto max-h-[55vh]">
              <p v-if="stockCheckResult?.allSufficient" class="text-sm text-emerald-600 text-center py-4">
                ✅ 太棒了！所有颜色库存充足，可以开始制作！
              </p>
              <div v-else class="space-y-1.5">
                <p class="text-xs text-slate-500 mb-2">
                  共需 {{ stockCheckResult?.totalNeed?.toLocaleString() }} 颗，
                  缺口 {{ stockCheckResult?.totalLack?.toLocaleString() }} 颗
                </p>
                <div
                  v-for="item in stockCheckResult?.items"
                  :key="item.colorCode"
                  class="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                  :class="item.sufficient ? 'bg-emerald-50' : 'bg-red-50'"
                >
                  <span
                    class="w-5 h-5 rounded-md flex-shrink-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]"
                    :style="{ background: item.colorHex }"
                  />
                  <span class="flex-1 text-xs font-medium text-slate-700">{{ item.colorCode }}</span>
                  <span class="text-[11px] text-slate-500">需{{ item.needNum }}</span>
                  <span class="text-[11px]" :class="item.sufficient ? 'text-emerald-600' : 'text-red-500'">
                    {{ item.sufficient ? `✓${item.stockNum}` : `缺${item.lackNum}` }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ====== 导出配置弹窗 ====== -->
      <Teleport to="body">
        <div
          v-if="showExportDialog"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          @click.self="showExportDialog = false"
        >
          <div class="bg-white rounded-2xl w-[400px] max-w-[92vw] max-h-[85vh] overflow-hidden shadow-xl flex flex-col">
            <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
              <h3 class="text-sm font-bold text-slate-800">📥 导出图纸</h3>
              <button class="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center" @click="showExportDialog = false">
                <XIcon :size="14" class="text-slate-400" />
              </button>
            </div>
            <div class="p-4 space-y-4 overflow-y-auto flex-1">
              <!-- 格式选择 -->
              <div>
                <label class="text-xs font-medium text-slate-500 mb-1.5 block">导出格式</label>
                <div class="flex flex-wrap gap-1.5">
                  <button v-for="f in exportFormats" :key="f.key"
                    class="px-3 h-8 rounded-lg text-xs font-medium transition-all"
                    :class="exportFormat === f.key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                    @click="exportFormat = f.key"
                  >{{ f.label }}</button>
                </div>
              </div>
              <!-- PNG 选项 -->
              <template v-if="exportFormat === 'png'">
                <div>
                  <label class="text-xs font-medium text-slate-500 mb-1 block">缩放倍率</label>
                  <div class="flex gap-1.5">
                    <button v-for="s in [1,2,3]" :key="s"
                      class="w-10 h-7 rounded-lg text-xs font-medium transition-all"
                      :class="exportOpts.scale === s ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                      @click="exportOpts.scale = s"
                    >{{ s }}x</button>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <input type="checkbox" v-model="exportOpts.showGrid" id="expGrid" class="rounded" />
                  <label for="expGrid" class="text-xs text-slate-600">显示网格线</label>
                </div>
              </template>
              <!-- PDF 选项 -->
              <template v-if="exportFormat === 'pdf'">
                <div>
                  <label class="text-xs font-medium text-slate-500 mb-1 block">图纸模式</label>
                  <div class="flex gap-1.5">
                    <button v-for="m in [{k:'color',l:'彩色版'},{k:'bw',l:'黑白省墨版'}]" :key="m.k"
                      class="px-3 h-7 rounded-lg text-xs font-medium transition-all"
                      :class="exportOpts.mode === m.k ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                      @click="exportOpts.mode = m.k"
                    >{{ m.l }}</button>
                  </div>
                </div>
                <div>
                  <label class="text-xs font-medium text-slate-500 mb-1 block">损耗比例</label>
                  <div class="flex gap-1.5">
                    <button v-for="l in [0,5,10]" :key="l"
                      class="w-12 h-7 rounded-lg text-xs font-medium transition-all"
                      :class="exportOpts.lossRate === l ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                      @click="exportOpts.lossRate = l"
                    >{{ l }}%</button>
                  </div>
                </div>
              </template>
            </div>
            <div class="px-4 pb-4 pt-1 flex gap-2 flex-shrink-0">
              <button class="flex-1 h-10 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium" @click="showExportDialog = false">取消</button>
              <button class="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50" :disabled="exporting" @click="doExport">
                {{ exporting ? '导出中...' : '导出下载' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ====== 分享弹窗 ====== -->
      <Teleport to="body">
        <div
          v-if="showShare"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          @click.self="showShare = false"
        >
          <div class="bg-white rounded-2xl w-[320px] max-w-[90vw] overflow-hidden shadow-xl">
            <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h3 class="text-sm font-semibold text-slate-800">分享作品</h3>
              <button
                class="w-7 h-7 flex items-center justify-center rounded-full text-slate-400
                       hover:text-slate-600 hover:bg-slate-100 transition-all duration-150"
                @click="showShare = false"
              >✕</button>
            </div>
            <div class="p-4 space-y-1">
              <button
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-700
                       hover:bg-slate-50 transition-all duration-150"
                @click="copyLink"
              >🔗 复制页面链接</button>
              <button
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-700
                       hover:bg-slate-50 transition-all duration-150"
                @click="saveImage"
              >🖼️ 保存作品图片</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ====== 全屏看图器 ====== -->
      <Teleport to="body">
        <div
          v-if="showZoom"
          class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          @click.self="showZoom = false"
          @wheel.prevent="handleZoom"
          @keydown.esc="showZoom = false"
        >
          <canvas ref="zoomCanvas" class="max-w-[90vw] max-h-[90vh] pixel-thumb" />
          <button
            class="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full
                   flex items-center justify-center text-white text-lg hover:bg-white/30
                   transition-all duration-150"
            @click="showZoom = false"
          >✕</button>
          <p class="absolute bottom-4 text-white/60 text-xs">滚轮缩放 · ESC 关闭</p>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { X as XIcon } from 'lucide-vue-next'
import API from '@/api/index.js'
import { useAuth } from '@/composables/useAuth.js'
import { useToast } from '@/composables/useToast.js'
import DetailCommentSection from '@/components/detail/DetailCommentSection.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const toast = useToast()

const work = ref(null)
const loading = ref(true)
const error = ref('')
const previewCanvas = ref(null)
const zoomCanvas = ref(null)
const zoomScale = ref(4)
const showZoom = ref(false)
const showShare = ref(false)
const showStockCheck = ref(false)
const stockCheckResult = ref(null)

// 标签（从用料品牌或分类推导）
const tags = computed(() => {
  if (!work.value) return []
  const t = []
  if (work.value.brand) t.push(work.value.brand)
  if (work.value.beanInfo?.seriesName) t.push(work.value.beanInfo.seriesName)
  if (work.value.isRemix) t.push('二创')
  return t
})

// 难度颜色
const difficultyColor = computed(() => {
  const d = work.value?.baseParam?.difficulty || 1
  return d === 1 ? 'text-emerald-600' : d === 2 ? 'text-amber-600' : 'text-red-500'
})

// 完整时间字符串（用于 hover）
const isOwnWork = computed(() => {
  const uid = auth.user?.value?.id
  const wid = work.value?.userId
  if (!uid || !wid) return false
  // 使用宽松比较，兼容 localStorage 字符串和 API 数字
  return uid == wid || String(uid) === String(wid)
})

const fullTimeStr = computed(() => {
  const t = work.value?.publishedAt || work.value?.createdAt
  if (!t) return ''
  try {
    return new Date(t).toLocaleString('zh-CN')
  } catch {
    return t
  }
})

onMounted(async () => {
  await fetchDetail()
})

// 监听 work 数据加载完成，在 DOM 更新后渲染 canvas
watch(work, (val) => {
  if (val) renderPreview()
}, { flush: 'post' })

async function fetchDetail() {
  loading.value = true
  error.value = ''
  try {
    // 使用新的作品详情 API
    const res = await API.get('/api/work/detail/' + route.params.id, auth.isLoggedIn.value)
    work.value = res.data
    // canvas 渲染由 watch(work, ..., { flush: 'post' }) 自动触发
  } catch (e) {
    // 如果新 API 不可用，回退到旧 API
    try {
      const res = await API.get('/api/designs/' + route.params.id, auth.isLoggedIn.value)
      work.value = adaptOldFormat(res.data)
    } catch (e2) {
      error.value = e.message || '加载失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}

/** 适配旧版 API 数据格式 */
function adaptOldFormat(data) {
  return {
    ...data,
    baseParam: {
      gridSize: `${data.gridWidth}×${data.gridHeight}`,
      difficulty: data.difficulty || 1,
      difficultyText: ['', '简单', '中等', '困难'][data.difficulty || 1] || '简单',
      costTime: data.costTime || '',
      realSize: data.realSize || '',
    },
    beanInfo: {
      seriesName: '',
      totalColorType: data.colorCount || 0,
      totalBeanNum: data.beadCount || 0,
      colorList: [],
    },
    author: data.author || { nickname: '匿名', fansCount: 0, isFollow: false },
    isLiked: data.liked || false,
    commentCount: 0,
    copyrightDesc: data.copyrightDesc || '',
    isRemix: data.isRemix || false,
  }
}

/** 获取 grid 数据（兼容字符串和数组两种格式） */
function getGridData() {
  if (!work.value) return []
  const raw = work.value.gridData
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  // 可能是未解析的 JSON 字符串
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return []
}

/** 渲染预览图 */
function renderPreview() {
  const canvas = previewCanvas.value
  if (!canvas || !work.value) {
    console.warn('[DetailView] renderPreview: canvas 或 work 为空', { canvas: !!canvas, work: !!work.value })
    return
  }
  const w = work.value
  const grid = getGridData()
  console.log('[DetailView] renderPreview: grid 行数=' + grid.length + ', gridWidth=' + w.gridWidth + ', gridHeight=' + w.gridHeight)

  const gridW = w.gridWidth || 58
  const gridH = w.gridHeight || 58

  // 计算合适的像素尺寸：确保每个格点至少 2px，同时适配容器
  const previewWidth = Math.min(580, window.innerWidth - 60)
  const cellSize = Math.max(2, Math.floor(previewWidth / Math.max(gridW, gridH)))
  const cw = cellSize * gridW
  const ch = cellSize * gridH

  canvas.width = cw
  canvas.height = ch
  canvas.style.width = cw + 'px'
  canvas.style.height = ch + 'px'

  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false

  // 先铺底色
  ctx.fillStyle = '#f1f5f9'
  ctx.fillRect(0, 0, cw, ch)

  if (grid.length === 0) {
    // 无网格数据时显示占位提示
    ctx.fillStyle = '#94a3b8'
    ctx.font = Math.max(12, cellSize * 2) + 'px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('暂无预览', cw / 2, ch / 2)
    return
  }

  let drawnCount = 0
  for (let r = 0; r < Math.min(grid.length, gridH); r++) {
    const row = grid[r]
    if (!Array.isArray(row)) continue
    for (let c = 0; c < Math.min(row.length, gridW); c++) {
      const cell = row[c]
      if (cell && cell.hex) {
        ctx.fillStyle = cell.hex
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
        drawnCount++
      }
    }
  }
  console.log('[DetailView] renderPreview: 绘制了 ' + drawnCount + ' 个像素')
}

/** 全屏看图器渲染 */
function renderZoomCanvas() {
  const canvas = zoomCanvas.value
  if (!canvas || !work.value) return
  const w = work.value
  const grid = getGridData()

  const gridW = w.gridWidth || 58
  const gridH = w.gridHeight || 58
  const scale = zoomScale.value
  const cw = scale * gridW
  const ch = scale * gridH

  canvas.width = cw
  canvas.height = ch
  canvas.style.width = Math.min(cw, window.innerWidth * 0.9) + 'px'
  canvas.style.height = Math.min(ch, window.innerHeight * 0.9) + 'px'

  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false

  ctx.fillStyle = '#1e1e1e'
  ctx.fillRect(0, 0, cw, ch)

  if (grid.length === 0) return

  for (let r = 0; r < Math.min(grid.length, gridH); r++) {
    const row = grid[r]
    if (!Array.isArray(row)) continue
    for (let c = 0; c < Math.min(row.length, gridW); c++) {
      const cell = row[c]
      if (cell && cell.hex) {
        ctx.fillStyle = cell.hex
        ctx.fillRect(c * scale, r * scale, scale, scale)
      }
    }
  }
}

// 监听全屏看图器打开
watch(showZoom, async (val) => {
  if (val) {
    await nextTick()
    renderZoomCanvas()
  }
})

/** 点赞/取消 */
async function toggleLike() {
  if (!auth.isLoggedIn.value) return requireLogin()
  try {
    const res = await API.post('/api/work/like', { workId: work.value.id })
    work.value.isLiked = res.data.liked
    work.value.likesCount = res.data.likesCount
  } catch (e) {
    // 回退到旧 API
    try {
      const res = await API.post('/api/designs/' + work.value.id + '/like', {})
      work.value.isLiked = res.data.liked
      work.value.likesCount = (work.value.likesCount || 0) + (res.data.liked ? 1 : -1)
    } catch (e2) {
      toast.show(e.message)
    }
  }
}

/** 关注/取消关注 */
async function toggleFollow() {
  try {
    const res = await API.post('/api/user/follow', { targetUid: work.value.author.id })
    work.value.author.isFollow = res.data.isFollow
    work.value.author.fansCount += res.data.isFollow ? 1 : -1
    toast.show(res.data.isFollow ? '已关注' : '已取消关注')
  } catch (e) {
    toast.show(e.message)
  }
}

// ===== 导出 =====
const showExportDialog = ref(false)
const exportFormat = ref('png')
const exportOpts = ref({ scale: 2, showGrid: true, showLabels: false, mode: 'color', lossRate: 5 })
const exporting = ref(false)
const exportFormats = [
  { key: 'png', label: 'PNG 图片' },
  { key: 'pdf', label: 'PDF 图纸' },
  { key: 'csv', label: 'CSV 清单' },
  { key: 'svg', label: 'SVG 矢量' },
  { key: 'json', label: 'JSON 源文件' },
  { key: 'zip', label: 'ZIP 打包' },
]

/** 下载操作 — 跳转导出预览页 */
function handleDownloadAction() {
  if (!auth.isLoggedIn.value) return requireLogin()
  // 自己的作品直接导出，别人的需要先点赞
  if (!isOwnWork.value && !work.value.isLiked) { toggleLike(); return }
  openExportPage()
}

/** 跳转到导出预览页面 */
function openExportPage() {
  const w = work.value
  const grid = getGridData()
  if (!grid.length) { toast.show('暂无图纸数据'); return }

  // 构建颜色映射：hex → { id, code, hex, name }
  const colorMap = []
  const seen = new Set()
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r]
    if (!row) continue
    for (let c = 0; c < (w.gridWidth || grid[r]?.length || 0); c++) {
      const cell = row[c]
      if (!cell?.hex) continue
      const hex = cell.hex.toUpperCase()
      if (seen.has(hex)) continue
      seen.add(hex)
      colorMap.push({
        id: hex,
        code: cell.name?.split(' ')[0] || cell.name || hex,
        hex: cell.hex,
        name: cell.name || '',
        brand: cell.brand || '',
      })
    }
  }

  // 展平网格
  const pixels = []
  const gw = w.gridWidth || 58
  const gh = w.gridHeight || 58
  for (let r = 0; r < gh; r++) {
    const row = grid[r]
    for (let c = 0; c < gw; c++) {
      const cell = row?.[c]
      pixels.push(cell?.hex ? cell.hex.toUpperCase() : null)
    }
  }

  localStorage.setItem('export-canvas-data', JSON.stringify({
    pixels,
    width: gw,
    height: gh,
    title: w.title || '拼豆图纸',
  }))
  localStorage.setItem('export-color-map', JSON.stringify(colorMap))

  // 他人作品强制水印
  const isOwner = auth.user?.value?.id === w.userId
  const authorName = w.author?.nickname || w.author?.username || ''
  router.push({
    path: '/export',
    query: {
      forceWatermark: isOwner ? '0' : '1',
      authorName: authorName,
    },
  })
}

/** 执行导出 */
async function doExport() {
  exporting.value = true
  try {
    const id = work.value?.id
    if (!id) { toast.show('作品数据加载中，请稍后重试'); exporting.value = false; return }
    const fmt = exportFormat.value
    let url = `/api/export/${fmt}/${id}`
    const body = { ...exportOpts.value }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + auth.token.value },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || '导出失败')
    }

    const blob = await res.blob()
    const extMap = { png: 'png', pdf: 'pdf', csv: 'csv', svg: 'svg', json: 'json', zip: 'zip' }
    const ext = extMap[fmt] || 'png'
    const downloadUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `${work.value.title || '图纸'}.${ext}`
    a.click()
    URL.revokeObjectURL(downloadUrl)
    toast.show('导出成功')
    showExportDialog.value = false
  } catch (e) {
    toast.show(e.message || '导出失败')
  }
  exporting.value = false
}

/** 检测库存 */
async function checkStock() {
  if (!auth.isLoggedIn.value) return requireLogin()
  try {
    const res = await API.post('/api/stock/check-work', { workId: work.value.id })
    stockCheckResult.value = res.data
    showStockCheck.value = true
  } catch (e) {
    toast.show(e.message)
  }
}

/** 复制链接 */
function copyLink() {
  const url = window.location.href
  navigator.clipboard.writeText(url).then(() => {
    toast.show('链接已复制')
    showShare.value = false
  }).catch(() => {
    toast.show('复制失败，请手动复制')
  })
}

/** 保存图片 */
function saveImage() {
  const canvas = previewCanvas.value
  if (!canvas) return
  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = (work.value?.title || '作品') + '.png'
  a.click()
  showShare.value = false
}

/** 全屏缩放 */
function handleZoom(e) {
  if (e.deltaY < 0) zoomScale.value = Math.min(20, zoomScale.value + 1)
  else zoomScale.value = Math.max(2, zoomScale.value - 1)
  renderZoomCanvas()
}

/** 要求登录 */
function requireLogin() {
  router.push('/login')
}

/** 格式化时间 */
function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 86400000) return '今天 ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (diff < 172800000) return '昨天'
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
  return d.toLocaleDateString('zh-CN')
}

/** 格式化数字 */
function formatCount(n) {
  if (!n) return '0'
  if (n >= 10000) return (n / 1000).toFixed(1) + 'k'
  return n.toLocaleString()
}
</script>
