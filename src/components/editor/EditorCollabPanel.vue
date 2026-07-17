<!--
  EditorCollabPanel.vue — 协作面板
  成员列表 + 分享链接 + 权限设置
-->
<template>
  <div class="flex-1 flex flex-col overflow-hidden text-[11px]">
    <!-- 协作状态 -->
    <div class="px-3 py-2 border-b border-[var(--ui-border)]">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full" :class="connected ? 'bg-emerald-500' : 'bg-slate-300'" />
        <span class="font-medium">{{ connected ? `${members.length} 人在线` : '未连接' }}</span>
        <button v-if="!connected" class="ml-auto text-[10px] text-[var(--ui-accent)] hover:underline" @click="$emit('connect')">
          连接
        </button>
      </div>
    </div>

    <!-- 在线成员 -->
    <div class="flex-1 overflow-y-auto">
      <div v-for="m in members" :key="m.socketId" class="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--ui-border)]/50">
        <div class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
          :style="{ background: m.color }">
          {{ (m.nickname || '?')[0] }}
        </div>
        <span class="flex-1 truncate">{{ m.nickname }}</span>
        <span v-if="m.cursor" class="text-[9px] text-[var(--ui-text-tertiary)] font-mono">
          {{ m.cursor.r }},{{ m.cursor.c }}
        </span>
      </div>
      <div v-if="!members.length" class="text-[10px] text-[var(--ui-text-tertiary)] text-center py-6">
        {{ connected ? '等待成员加入...' : '点击连接开始协作' }}
      </div>
    </div>

    <!-- 分享链接 -->
    <div class="px-3 py-2 border-t border-[var(--ui-border)] space-y-1.5">
      <div class="text-[10px] font-medium text-[var(--ui-text-secondary)]">分享协作链接</div>
      <div class="flex gap-1">
        <input :value="shareLink" readonly
          class="flex-1 h-6 border border-[var(--ui-border)] rounded px-1.5 text-[9px] bg-[var(--ui-bg-tertiary)] truncate" />
        <button class="px-2 h-6 rounded text-[10px] bg-[var(--ui-accent)] text-white hover:opacity-90"
          @click="copyLink">{{ copied ? '✓' : '复制' }}</button>
      </div>
      <div class="flex items-center gap-2 text-[9px] text-[var(--ui-text-tertiary)]">
        <select v-model="permission" class="border rounded px-1 py-0.5 text-[9px]" @change="$emit('setPermission', permission)">
          <option value="view">可查看</option>
          <option value="comment">可评论</option>
          <option value="edit">可编辑</option>
        </select>
      </div>
    </div>

    <!-- 批注列表 -->
    <div v-if="comments.length" class="border-t border-[var(--ui-border)] max-h-32 overflow-y-auto">
      <div v-for="c in comments" :key="c.id" class="px-2 py-1 border-b border-[var(--ui-border)]/50 text-[10px]"
        :class="{ 'opacity-50': c.resolved }">
        <div class="flex items-center gap-1">
          <span class="font-medium">{{ c.nickname }}</span>
          <span v-if="c.r !== undefined" class="text-[var(--ui-text-tertiary)]">({{ c.r }},{{ c.c }})</span>
          <button v-if="!c.resolved" class="ml-auto text-[8px] text-[var(--ui-accent)]" @click="$emit('resolveComment', c.id)">解决</button>
        </div>
        <div class="text-[var(--ui-text-secondary)]">{{ c.text }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  connected: Boolean,
  members: { type: Array, default: () => [] },
  comments: { type: Array, default: () => [] },
  designId: String,
})

defineEmits(['connect', 'setPermission', 'resolveComment'])

const permission = ref('view')
const copied = ref(false)

const shareLink = computed(() => {
  if (!props.designId) return ''
  return `${location.origin}/#/editor/${props.designId}?collab=1`
})

function copyLink() {
  navigator.clipboard?.writeText(shareLink.value)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}
</script>
