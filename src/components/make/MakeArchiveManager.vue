<!-- ============================================
  MakeArchiveManager.vue — 多存档管理面板
  新建/重命名/删除/切换存档
  ============================================ -->
<template>
  <div class="archive-overlay" @click.self="$emit('close')">
    <div class="archive-panel">
      <div class="archive-header">
        <h3>存档管理</h3>
        <button class="archive-close" @click="$emit('close')">✕</button>
      </div>

      <!-- 新建存档 -->
      <div class="archive-form">
        <input
          v-model="newName"
          class="archive-input"
          placeholder="新存档名称..."
          type="text"
          @keyup.enter="handleCreate"
        />
        <button class="archive-create-btn" @click="handleCreate" :disabled="!newName.trim()">
          新建
        </button>
      </div>

      <!-- 存档列表 -->
      <div class="archive-list">
        <div
          v-for="a in archives"
          :key="a.id"
          class="archive-item"
          :class="{ active: a.name === activeName }"
        >
          <div class="archive-item-info" @click="$emit('switch', a)">
            <FolderIcon :size="16" class="archive-item-icon" />
            <div>
              <div class="archive-item-name">{{ a.name }}</div>
              <div class="archive-item-meta">
                {{ formatTime(a.updatedAt || a.updated_at) }}
              </div>
            </div>
          </div>

          <div class="archive-item-actions">
            <button
              v-if="a.name !== activeName"
              class="archive-item-btn"
              @click="$emit('switch', a)"
              title="切换到此存档"
            >
              切换
            </button>
            <button
              class="archive-item-btn danger"
              @click="$emit('delete', a.id)"
              title="删除存档"
              :disabled="archives.length <= 1"
            >
              <TrashIcon :size="14" />
            </button>
          </div>
        </div>

        <div v-if="!archives || archives.length === 0" class="archive-empty">
          暂无存档
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  designId: { type: Number, default: null },
  archives: { type: Array, default: () => [] },
  activeName: { type: String, default: '' },
})

const emit = defineEmits(['create', 'switch', 'delete', 'close'])

import { FolderIcon, TrashIcon } from 'lucide-vue-next'

const newName = ref('')

function handleCreate() {
  if (!newName.value.trim()) return
  emit('create', newName.value.trim())
  newName.value = ''
}

function formatTime(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return '' }
}
</script>

<style scoped>
.archive-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.archive-panel {
  width: 100%;
  max-width: 400px;
  max-height: 60vh;
  background: #fff;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.archive-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 10px;
}
.archive-header h3 {
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}
.archive-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
}

.archive-form {
  display: flex;
  gap: 8px;
  padding: 0 16px 10px;
}

.archive-input {
  flex: 1;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  padding: 0 10px;
  font-size: 13px;
  color: #475569;
  background: #f8fafc;
}

.archive-create-btn {
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: none;
  background: #2563eb;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.archive-create-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.archive-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 10px;
}

.archive-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 8px;
  border-radius: 12px;
  transition: background 0.1s;
}
.archive-item:hover {
  background: #f8fafc;
}
.archive-item.active {
  background: #eff6ff;
}

.archive-item-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}

.archive-item-icon {
  color: #94a3b8;
  flex-shrink: 0;
}

.archive-item-name {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.archive-item-meta {
  font-size: 11px;
  color: #94a3b8;
}

.archive-item-actions {
  display: flex;
  gap: 6px;
}

.archive-item-btn {
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  font-size: 11px;
  cursor: pointer;
}
.archive-item-btn.danger {
  color: #ef4444;
  border-color: #fecaca;
}
.archive-item-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.archive-empty {
  text-align: center;
  padding: 30px;
  color: #94a3b8;
  font-size: 13px;
}
</style>
