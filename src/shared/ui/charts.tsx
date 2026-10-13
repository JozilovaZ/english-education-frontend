import { useEffect, useId, useRef, useState } from 'react'

import { CHART } from '@/app/palette'

/* ------------------------------ Chiziqli grafik ------------------------------ */

export interface LinePoint {
  label: string
  value: number
  /** Tooltipdagi to'liq nom: "Aprel 2026" */
  title?: string
}

/** "Chiroyli" yuqori chegara: 1, 2, 5 × 10ⁿ */
function niceMax(v: number) {
  if (v <= 4) return 4
  const p = 10 ** Math.floor(Math.log10(v))
  const n = v / p
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * p
}

/** Silliq egri chiziq (Catmull-Rom → Bezier), nuqtalardan chiqib ketmaydi */
function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1] ?? pts[i]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const [x3, y3] = pts[i + 2] ?? pts[i + 1]
    const t = 0.16
    const c1x = x1 + (x2 - x0) * t
    const c2x = x2 - (x3 - x1) * t
    const lo = Math.min(y1, y2)
    const hi = Math.max(y1, y2)
    const c1y = Math.min(hi, Math.max(lo, y1 + (y2 - y0) * t))
    const c2y = Math.min(hi, Math.max(lo, y2 - (y3 - y1) * t))
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`
  }
  return d
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/**
 * Bitta seriyali chiziqli grafik (vaqt bo'yicha o'zgarish). Legenda yo'q — sarlavha nomlaydi.
 * Hover: vertikal chiziq + tooltip; ekran o'quvchilari uchun yashirin jadval.
 */
export function LineChart({
  data,
  height = 220,
  unit = '',
  caption,
}: {
  data: LinePoint[]
  height?: number
  unit?: string
  caption: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const gradId = useId()

  const padL = 36
  const padR = 12
  const padT = 12
  const padB = 28
  const w = Math.max(width, 200)
  const innerW = w - padL - padR
  const innerH = height - padT - padB
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f))
  const x = (i: number) => padL + (data.length <= 1 ? innerW / 2 : (innerW * i) / (data.length - 1))
  const y = (v: number) => padT + innerH - (innerH * v) / max
  const pts = data.map((d, i) => [x(i), y(d.value)] as [number, number])
  const line = smoothPath(pts)
  const area = pts.length
    ? `${line} L${pts[pts.length - 1][0]},${padT + innerH} L${pts[0][0]},${padT + innerH} Z`
    : ''
  const band = data.length > 1 ? innerW / (data.length - 1) : innerW
  const h = hover !== null ? data[hover] : null

  return (
    <div ref={ref} className="ee-chart" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg height={height} role="img" aria-label={caption}>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--ee-chart-1)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--ee-chart-1)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line className="ee-chart__grid" x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} />
              <text className="ee-chart__axis" x={padL - 8} y={y(t) + 4} textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          {data.map((d, i) => (
            <text
              key={d.label + i}
              className="ee-chart__axis"
              x={x(i)}
              y={height - 8}
              textAnchor="middle"
            >
              {d.label}
            </text>
          ))}
          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} className="ee-chart__line" />
          {hover !== null && (
            <line
              className="ee-chart__cross"
              x1={x(hover)}
              x2={x(hover)}
              y1={padT}
              y2={padT + innerH}
            />
          )}
          {pts.map(([px, py], i) => (
            <circle key={i} className="ee-chart__dot" cx={px} cy={py} r={hover === i ? 6 : 4} />
          ))}
          {/* Hover nishonlari — nuqtadan kengroq */}
          {data.map((_, i) => (
            <rect
              key={i}
              x={x(i) - band / 2}
              y={padT}
              width={band}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      )}
      {h && hover !== null && (
        <div className="ee-chart__tip" style={{ left: x(hover), top: y(h.value) }}>
          {h.title ?? h.label}
          <strong>
            {h.value}
            {unit && ` ${unit}`}
          </strong>
        </div>
      )}
      <table className="ee-visually-hidden">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th>{d.title ?? d.label}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------ Doira (donut) ------------------------------ */

export interface DonutSlice {
  label: string
  value: number
}

/**
 * Qismlar ulushi: ranglar CHART tartibida (aylantirilmaydi), 5 tadan ko'pi "Boshqa"ga yig'iladi.
 * Bo'laklar orasida 2px oraliq; legenda doim — nom, son va foiz bilan.
 */
export function DonutChart({
  data,
  totalLabel,
  size = 150,
  unit = 'ta',
}: {
  data: DonutSlice[]
  totalLabel: string
  size?: number
  unit?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value)
  const slices =
    sorted.length > CHART.length
      ? [
          ...sorted.slice(0, CHART.length - 1),
          {
            label: 'Boshqa',
            value: sorted.slice(CHART.length - 1).reduce((s, d) => s + d.value, 0),
          },
        ]
      : sorted
  const total = slices.reduce((s, d) => s + d.value, 0)
  const stroke = 18
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const gap = slices.length > 1 ? 3 : 0
  const offsets = slices.map((_, i) =>
    slices.slice(0, i).reduce((sum, d) => sum + (d.value / total) * c, 0),
  )

  return (
    <div className="ee-donut">
      <div className="ee-donut__ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={`${totalLabel}: ${total}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--ee-surface-muted)"
            strokeWidth={stroke}
          />
          {slices.map((s, i) => {
            const len = (s.value / total) * c
            return (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={`var(--ee-chart-${i + 1})`}
                strokeWidth={active === i ? stroke + 4 : stroke}
                strokeDasharray={`${Math.max(len - gap, 0.5)} ${c}`}
                strokeDashoffset={-offsets[i]}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                opacity={active === null || active === i ? 1 : 0.35}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                style={{ transition: 'opacity .15s, stroke-width .15s' }}
              >
                <title>{`${s.label}: ${s.value} ${unit}`}</title>
              </circle>
            )
          })}
        </svg>
        <div className="ee-donut__center">
          <strong className="ee-num">{active === null ? total : slices[active].value}</strong>
          <span>{active === null ? totalLabel : slices[active].label}</span>
        </div>
      </div>
      <ul className="ee-legend">
        {slices.map((s, i) => (
          <li
            key={s.label}
            className={active !== null && active !== i ? 'is-dim' : undefined}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <i style={{ background: `var(--ee-chart-${i + 1})` }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.label}
            </span>
            <small>
              {s.value} {unit} ({Math.round((s.value / total) * 100)}%)
            </small>
          </li>
        ))}
      </ul>
    </div>
  )
}
