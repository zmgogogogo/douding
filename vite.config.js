import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    host: true, // 监听 0.0.0.0，允许局域网设备（iPad 等）通过 IP 访问
    proxy: {
      // 图片转换 → Node.js（正确 pipe multipart 流到 Python）
      '/api/image-to-grid': 'http://localhost:8080',
      '/api/convert': 'http://localhost:8080',
      // 其他 API 请求 → SpringBoot (8080)
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
