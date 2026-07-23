// ============================================
//  useToast — 全局提示条（组合式函数）
// ============================================
import { ref } from 'vue'

// 全局 toast 状态（单例）
const message = ref('')
const visible = ref(false)
let timer = null

export function useToast() {
  function show(msg) {
    message.value = msg
    visible.value = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = false
    }, 2000)
  }

  return { message, visible, show }
}
