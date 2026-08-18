// ============================================
//  useResponsive.js — 响应式断点检测
//  用于平板/桌面适配，基于 CSS matchMedia
//  比 user-agent 更可靠（iPad 现在报 Mac Safari）
// ============================================
import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * 断点定义（与 Tailwind 对齐）：
 *   isPhone   < 768px   — 手机（后期 APP 覆盖，暂不做）
 *   isTablet  768-1023  — 平板竖屏，触控优化目标
 *   isDesktop ≥ 1024px  — 平板横屏 + 桌面，基准布局
 */
const BREAKPOINTS = {
  phone: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
}

// 全局单例（多个组件共享同一个 media query listener）
let instance = null

function createInstance() {
  const isPhone = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(true) // 默认桌面（SSR / 初始渲染安全值）

  const listeners = []

  function update() {
    isPhone.value = listeners[0]?.matches ?? false
    isTablet.value = listeners[1]?.matches ?? false
    isDesktop.value = listeners[2]?.matches ?? false
  }

  function setup() {
    for (const [key, query] of Object.entries(BREAKPOINTS)) {
      const mql = window.matchMedia(query)
      listeners.push(mql)
      mql.addEventListener('change', update)
    }
    update()
  }

  function teardown() {
    listeners.forEach((mql, i) => {
      mql.removeEventListener('change', update)
    })
    listeners.length = 0
  }

  return {
    isPhone,
    isTablet,
    isDesktop,
    // 便捷组合
    isCompact: computed(() => isPhone.value || isTablet.value), // 非桌面 = 触控优先
    setup,
    teardown,
  }
}

export function useResponsive() {
  if (!instance) {
    instance = createInstance()
  }

  let cleanup = null

  onMounted(() => {
    // 首个挂载的组件初始化 listener
    instance.setup()
    cleanup = () => {
      instance.teardown()
      instance = null
    }
  })

  onUnmounted(() => {
    // 最后一个卸载的组件清理（简化处理：每个都调用，teardown 幂等）
    // 实际保持 instance 存活，因为其他组件可能还在用
  })

  return {
    isPhone: instance.isPhone,
    isTablet: instance.isTablet,
    isDesktop: instance.isDesktop,
    isCompact: instance.isCompact,
  }
}
