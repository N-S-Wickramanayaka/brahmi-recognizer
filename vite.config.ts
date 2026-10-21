import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves the app from https://<user>.github.io/brahmi-recognizer/
export default defineConfig({
  base: "/brahmi-recognizer/",
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://anna-kurera--visformer-api-visformermodel-serve.modal.run',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
      }
    }
  }
})