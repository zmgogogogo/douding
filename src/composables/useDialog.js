// ============================================
//  useDialog — 全局对话框（替代 alert/confirm/prompt）
//  通过 provide/inject 让所有组件共享
// ============================================
import { inject } from 'vue'

export const DIALOG_KEY = Symbol('app-dialog')

export function useDialog() {
  const dialog = inject(DIALOG_KEY)
  if (!dialog) {
    // 降级：如果对话框未注入（如单元测试环境），使用原生弹窗
    console.warn('AppDialog 未注入，降级为原生弹窗')
    return {
      alert: (msg) => window.alert(msg),
      confirm: (msg) => Promise.resolve(window.confirm(msg)),
      prompt: (msg, defaultValue) => Promise.resolve(window.prompt(msg, defaultValue || ''))
    }
  }
  return {
    alert: (msg, title) => dialog.value.alert(msg, title),
    confirm: (msg, title) => dialog.value.confirm(msg, title),
    prompt: (msg, title, defaultValue, placeholder) =>
      dialog.value.prompt(msg, title, defaultValue, placeholder)
  }
}
