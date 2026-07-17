/**
 * 主题管理 — 浅色/深色/护眼三主题切换
 *
 * 特性：
 * - 跟随系统偏好自动切换（prefers-color-scheme）
 * - 手动选择优先于系统设置
 * - 持久化到 localStorage
 */

import { ref, watch } from 'vue'

const THEME_KEY = 'douding-theme'
const themes = ['light', 'dark', 'eye-care']

// 模块级单例
const currentTheme = ref(loadTheme())

function loadTheme() {
  // 1. 优先用户手动选择
  const saved = localStorage.getItem(THEME_KEY)
  if (saved && themes.includes(saved)) return saved

  // 2. 跟随系统
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'

  // 3. 默认浅色
  return 'light'
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  // 更新 meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    const colors = { light: '#ffffff', dark: '#1a1d27', 'eye-care': '#faf7f0' }
    meta.content = colors[theme] || '#ffffff'
  }
}

// 初始应用
applyTheme(currentTheme.value)

// 监听系统主题变化
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
      currentTheme.value = e.matches ? 'dark' : 'light'
    }
  })
}

watch(currentTheme, (theme) => {
  applyTheme(theme)
  localStorage.setItem(THEME_KEY, theme)
})

export function useTheme() {
  function setTheme(theme) {
    if (themes.includes(theme)) {
      currentTheme.value = theme
    }
  }

  function cycleTheme() {
    const idx = themes.indexOf(currentTheme.value)
    currentTheme.value = themes[(idx + 1) % themes.length]
  }

  function resetToSystem() {
    localStorage.removeItem(THEME_KEY)
    currentTheme.value = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return {
    theme: currentTheme,
    themes,
    setTheme,
    cycleTheme,
    resetToSystem,
  }
}
