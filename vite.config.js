import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') }
  },
  server: {
    proxy: {
      // 所有 API 请求 → Node.js Express (3456)
      // 图片转换请求由 Node.js 自动代理到 Python (3457)
      '/api': 'http://localhost:3456',
      '/uploads': 'http://localhost:3456'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
