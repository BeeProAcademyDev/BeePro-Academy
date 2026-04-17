import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@contexts': '/src/contexts',
      '@services': '/src/services',
      '@assets': '/src/assets',
      '@hooks': '/src/hooks',
      '@utils': '/src/utils'
    }
  }
})