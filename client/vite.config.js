import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: '/smartchatbot/',
    preview: {
      port: 5173,
      strictPort: true,
    },
    server: {
      origin: JSON.stringify(env.VITE_BACKEND_URL),
      port: 5173,
      host: true,
    },
    define: {
      'process.env.SOME_KEY': JSON.stringify(env.SOME_KEY)
    },
    plugins: [react()],
  }
})
