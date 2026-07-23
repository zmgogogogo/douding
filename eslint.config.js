// ============================================
//  ESLint Flat Config — Vue 3 + ESM
// ============================================
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'

export default [
  // 基础 JS 规则
  js.configs.recommended,

  // Vue 3 规则
  ...pluginVue.configs['flat/essential'],

  // 全局配置
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // 浏览器全局变量
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        // Node.js 全局变量
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      // 宽松的规则（逐步收紧）
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'no-console': 'off',
      // Vue 规则
      'vue/multi-word-component-names': 'off',  // 允许单字组件名（如 App.vue）
      'vue/no-unused-vars': 'warn',
    },
  },

  // 忽略配置
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/uploads/**',
      '*.db',
      '*.db-shm',
      '*.db-wal',
    ],
  },
]
