import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    minify: 'terser', // 切换到 terser 进行压缩
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境去除所有 console.* 调用
      },
    },
  },
})
