import { formatHms } from '@/shared/lib/format'

interface TimerProps {
  /** Qolgan soniyalar (hisoblashni chaqiruvchi boshqaradi — useCountdown) */
  seconds: number
  /** Jami ajratilgan soniyalar (chiziq uchun) */
  total: number
  label?: string
  /** Qolgan ulush shundan kam bo'lsa — amber "shoshiling" holati */
  urgentAt?: number
}

/** Dizayn tizimidagi Timer: HH:MM:SS (mono) + qolgan vaqt chizig'i */
export function Timer({ seconds, total, label = 'Qolgan vaqt', urgentAt = 0.1 }: TimerProps) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0
  const over = seconds <= 0
  const urgent = !over && ratio <= urgentAt
  return (
    <div
      className={`ee-timer${urgent ? ' ee-timer--urgent' : ''}${over ? ' ee-timer--over' : ''}`}
      role="timer"
      aria-live="off"
    >
      <span className="ee-timer__label">{over ? 'Vaqt tugadi' : label}</span>
      <span className="ee-timer__time">{formatHms(seconds)}</span>
      <span className="ee-timer__track">
        <span className="ee-timer__fill" style={{ width: `${ratio * 100}%` }} />
      </span>
    </div>
  )
}
