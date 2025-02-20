import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // 默认使用 esbuild 进行压缩
    esbuild: {
      drop: ['console', 'debugger'], // 同时去除 console 和 debugger
    },
  },
})
