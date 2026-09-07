import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  // Port dedie : evite le conflit avec les autres projets qui tournent en local.
  server: { port: 5180, strictPort: true },
  preview: { port: 5180, strictPort: true },
})
