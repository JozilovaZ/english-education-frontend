import { useEffect, useState } from 'react'

/**
 * Serverdan kelgan `remaining_seconds` asosida teskari sanoq.
 * Qolgan vaqt "hozir + remaining" nuqtasidan har soniyada qayta hisoblanadi — fon tabda
 * setInterval sekinlashsa ham taymer adashmaydi. Server qiymati yangilansa (`syncKey`
 * o'zgarsa), sanoq o'sha qiymatdan davom etadi.
 *
 * Sanoq hali boshlanmagan bo'lsa `null` qaytadi — `0` (vaqt tugadi) bilan adashtirmaslik uchun.
 */
export function useCountdown(
  serverSeconds: number | null | undefined,
  syncKey?: unknown,
): number | null {
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    if (serverSeconds === null || serverSeconds === undefined) return
    const endsAt = Date.now() + serverSeconds * 1000
    const tick = () => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [serverSeconds, syncKey])

  return serverSeconds === null || serverSeconds === undefined ? null : left
}
