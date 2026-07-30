<!-- ============================================
  BannerEditView.vue — Banner 新增/编辑
============================================ -->
<template>
  <div class="page-container">
    <div class="page-header">
      <el-button text @click="$router.back()"><el-icon><ArrowLeft /></el-icon> 返回列表</el-button>
      <h2 class="page-title">{{ isEdit ? '编辑 Banner' : '新增 Banner' }}</h2>
    </div>

    <el-card v-loading="loading">
      <el-form :model="form" label-position="top" :rules="rules" ref="formRef">
        <el-row :gutter="20">
          <el-col :span="16">
            <el-form-item label="标题" prop="title">
              <el-input v-model="form.title" placeholder="Banner 标题" />
            </el-form-item>
            <el-form-item label="副标题">
              <el-input v-model="form.subtitle" placeholder="可选副标题" />
            </el-form-item>
            <el-form-item label="图片链接">
              <el-input v-model="form.imageUrl" placeholder="图片 URL 地址" />
            </el-form-item>
            <el-form-item label="背景色">
              <el-color-picker v-model="form.bgColor" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="链接类型">
              <el-select v-model="form.linkType">
                <el-option label="内部路由" value="route" />
                <el-option label="外部链接" value="url" />
                <el-option label="无链接" value="none" />
              </el-select>
            </el-form-item>
            <el-form-item label="链接值" v-if="form.linkType !== 'none'">
              <el-input v-model="form.linkValue" :placeholder="form.linkType === 'route' ? '如 /editor' : '如 https://...'" />
            </el-form-item>
            <el-form-item label="排序权重">
              <el-input-number v-model="form.sortOrder" :min="0" :max="9999" />
            </el-form-item>
            <el-form-item label="状态">
              <el-switch v-model="form.status" active-text="启用" inactive-text="禁用" />
            </el-form-item>
            <el-form-item label="上线时间">
              <el-date-picker v-model="form.startTime" type="datetime" placeholder="留空则不限制" />
            </el-form-item>
            <el-form-item label="下线时间">
              <el-date-picker v-model="form.endTime" type="datetime" placeholder="留空则不限制" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-button type="primary" @click="save" :loading="saving">{{ isEdit ? '保存修改' : '创建 Banner' }}</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import adminAPI from '@/api/admin.js'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const saving = ref(false)
const formRef = ref(null)

const form = reactive({
  title: '', subtitle: '', imageUrl: '', bgColor: '#22c55e',
  linkType: 'route', linkValue: '', sortOrder: 0, status: true,
  startTime: null, endTime: null,
})

const rules = { title: [{ required: true, message: '请输入标题', trigger: 'blur' }] }

async function loadBanner() {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res = await adminAPI.get(`/api/admin/banners/${route.params.id}`)
    const b = res.data
    Object.assign(form, {
      title: b.title, subtitle: b.subtitle || '', imageUrl: b.image_url || '',
      bgColor: b.bg_color || '#22c55e', linkType: b.link_type || 'route',
      linkValue: b.link_value || '', sortOrder: b.sort_order || 0,
      status: !!b.status, startTime: b.start_time || null, endTime: b.end_time || null,
    })
  } catch (err) {
    ElMessage.error('加载Banner失败')
  } finally {
    loading.value = false
  }
}

async function save() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const data = {
      title: form.title, subtitle: form.subtitle, imageUrl: form.imageUrl,
      bgColor: form.bgColor, linkType: form.linkType, linkValue: form.linkValue,
      sortOrder: form.sortOrder, status: form.status ? 1 : 0,
      startTime: form.startTime || null, endTime: form.endTime || null,
    }

    if (isEdit.value) {
      await adminAPI.put(`/api/admin/banners/${route.params.id}`, data)
    } else {
      await adminAPI.post('/api/admin/banners', data)
    }
    ElMessage.success(isEdit.value ? '保存成功' : '创建成功')
    router.push('/admin/banners')
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadBanner)
</script>

<style scoped>
.page-container { max-width: 1000px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
</style>
