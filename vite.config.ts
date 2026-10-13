import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      // antd bitta ~1.3 MB (gzip ~406 kB) chunk — kesh uchun ataylab alohida, ogohlantirish shart emas.
      // Sinab ko'rilgan (2026-10-09): antd'ni sahifalarga bo'lish birinchi yuklashni atigi ~13%
      // kamaytiradi (480 → 419 kB gzip), chunki login sahifasining o'zi antd yadrosini yuklaydi.
      chunkSizeWarningLimit: 1400,
      rolldownOptions: {
        output: {
          // Kutubxonalar alohida chunk'larda: ilova kodi o'zgarganda brauzer keshi saqlanadi
          codeSplitting: {
            groups: [
              {
                name: 'antd',
                // [\\/] — Windows (\) va Unix (/) yo'llari uchun
                test: /node_modules[\\/](antd|@ant-design|@rc-component|rc-[^\\/]+)[\\/]/,
                priority: 20,
              },
              {
                name: 'react',
                test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
                priority: 20,
              },
              { name: 'vendor', test: /node_modules/, priority: 10 },
            ],
          },
        },
      },
    },
    server: {
      port: 5173,
      // niners.localhost, oxford.localhost kabi tenant subdomenlari uchun
      allowedHosts: ['.localhost'],
      proxy: {
        // changeOrigin: false — brauzerdagi Host header (masalan niners.localhost:5173)
        // Django'ga o'zgarmasdan boradi va django-tenants shu bo'yicha tenantni aniqlaydi.
        '/api': {
          target: backend,
          changeOrigin: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/media': {
          target: backend,
          changeOrigin: false,
        },
      },
    },
  }
})
