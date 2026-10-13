import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { App as AntApp, ConfigProvider } from 'antd'
import uzUZ from 'antd/locale/uz_UZ'
import dayjs from 'dayjs'
import 'dayjs/locale/uz-latn'
import { useLayoutEffect, useMemo } from 'react'
import { RouterProvider } from 'react-router/dom'

import { getPalette, paletteCssVars } from '@/app/palette'
import { queryClient } from '@/app/queryClient'
import { router } from '@/app/router'
import { getAntdTheme } from '@/app/theme'
import { useResolvedThemeMode } from '@/app/themeMode'
import { useAuthStore } from '@/features/auth/store'

dayjs.locale('uz-latn')

// Sessiya tugaganda (logout yoki refresh token eskirganda) boshqa foydalanuvchining
// keshdagi ma'lumotlari ko'rinib qolmasligi uchun keshni tozalaymiz.
useAuthStore.subscribe((state, prev) => {
  if (prev.user && !state.user) queryClient.clear()
})

export function App() {
  const mode = useResolvedThemeMode()
  const antdTheme = useMemo(() => getAntdTheme(mode), [mode])

  // Antd'dan tashqari komponentlar (StatusTag, KPI, grafik) uchun CSS o'zgaruvchilar
  useLayoutEffect(() => {
    const root = document.documentElement
    const palette = getPalette(mode)
    for (const [name, value] of Object.entries(paletteCssVars(palette))) {
      root.style.setProperty(name, value)
    }
    // index.html dagi dastlabki fon ham rejim o'zgarganda yangilanadi
    root.style.background = palette.bg
    root.dataset.theme = mode
    root.style.colorScheme = mode
  }, [mode])

  return (
    <ConfigProvider locale={uzUZ} theme={antdTheme}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  )
}
