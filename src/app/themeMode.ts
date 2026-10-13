import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { ThemeMode } from './palette'

export type ThemePreference = ThemeMode | 'system'

interface ThemeModeState {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

export const useThemeModeStore = create<ThemeModeState>()(
  persist(
    (set) => ({
      preference: 'dark',
      setPreference: (preference) => set({ preference }),
    }),
    { name: 'ee-theme', storage: createJSONStorage(() => localStorage) },
  ),
)

const QUERY = '(prefers-color-scheme: dark)'

function subscribeSystem(callback: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

/** Foydalanuvchi tanlovi + tizim sozlamasidan yakuniy rejim */
export function useResolvedThemeMode(): ThemeMode {
  const preference = useThemeModeStore((s) => s.preference)
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
  if (preference === 'system') return systemDark ? 'dark' : 'light'
  return preference
}
