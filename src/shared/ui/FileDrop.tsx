import { Button } from 'antd'
import { useState, type DragEvent } from 'react'

interface FileDropProps {
  value: File | null
  onChange: (file: File | null) => void
  /** Noto'g'ri tur yoki hajm — xabarni chaqiruvchi ko'rsatadi */
  onInvalid: (message: string) => void
  /** Ruxsat etilgan kengaytmalar: ['.pdf', '.doc', '.docx'] */
  accept: string[]
  maxMb: number
  title?: string
  /** Turlar izohi: "PDF, Word yoki rasm" */
  hint: string
  disabled?: boolean
}

/** Dizayndagi fayl tashlash maydoni: bosib tanlash yoki sudrab tashlash */
export function FileDrop({
  value,
  onChange,
  onInvalid,
  accept,
  maxMb,
  title = 'Faylni shu yerga tashlang yoki tanlang',
  hint,
  disabled,
}: FileDropProps) {
  const [over, setOver] = useState(false)

  const pick = (file?: File | null) => {
    if (!file) return
    const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
    if (!accept.includes(ext)) {
      onInvalid(`Faqat ${hint} (${accept.join(', ')}) yuklash mumkin.`)
      return
    }
    if (file.size > maxMb * 1024 * 1024) {
      onInvalid(`Fayl hajmi ${maxMb} MB dan oshmasligi kerak.`)
      return
    }
    onChange(file)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    if (!disabled) pick(e.dataTransfer.files[0])
  }

  if (value) {
    return (
      <div
        className="ee-sunken"
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, flexWrap: 'wrap' }}
      >
        <span aria-hidden style={{ fontWeight: 700 }}>
          ✓
        </span>
        <span style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>
          <strong>{value.name}</strong>
          <span className="ee-muted ee-mono" style={{ fontSize: 13, marginLeft: 8 }}>
            {(value.size / 1024 / 1024).toFixed(2)} MB
          </span>
        </span>
        <Button size="small" onClick={() => onChange(null)} disabled={disabled}>
          Olib tashlash
        </Button>
      </div>
    )
  }

  return (
    <label
      className={`ee-drop${over ? ' ee-drop--over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
      </svg>
      <strong style={{ color: 'var(--ee-text)' }}>{title}</strong>
      <span>
        {hint} · {maxMb} MB gacha
      </span>
      <input
        type="file"
        accept={accept.join(',')}
        disabled={disabled}
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </label>
  )
}
