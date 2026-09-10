import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    __SITE_UPDATED_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10))
  },
  base: '/'
})
