import { Tag } from '../StatusTag'

interface ScoreBarProps {
  score: number
  total: number
  /** O'tish bali; berilmasa (uy vazifasi) — O'tdi/O'ta olmadi va belgi ko'rsatilmaydi */
  passing?: number
  /** Backend hisoblagan natija; berilmasa score >= passing */
  passed?: boolean
}

/** Dizayn tizimidagi ScoreBar: katta ball, O'tdi/O'ta olmadi, chiziq va o'tish bali belgisi */
export function ScoreBar({ score, total, passing, passed }: ScoreBarProps) {
  const safeTotal = total > 0 ? total : 1
  const hasPassing = passing !== undefined
  const isPassed = passed ?? (hasPassing && score >= passing)
  const percent = Math.round((score / safeTotal) * 1000) / 10
  return (
    <div className="ee-scorebar">
      <div className="ee-scorebar__head">
        <span className="ee-score ee-scorebar__value">
          {score}
          <small>/ {total}</small>
        </span>
        {hasPassing && (
          <Tag variant={isPassed ? 'pos' : 'neg'}>{isPassed ? "O'tdi" : "O'ta olmadi"}</Tag>
        )}
      </div>
      <div
        className="ee-scorebar__track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={score}
        aria-label="To'plangan ball"
      >
        <span
          className="ee-scorebar__fill"
          style={{ width: `${Math.min(100, (score / safeTotal) * 100)}%` }}
        />
        {hasPassing && (
          <span
            className="ee-scorebar__pass"
            style={{ left: `${Math.min(100, (passing / safeTotal) * 100)}%` }}
          />
        )}
      </div>
      <span className="ee-scorebar__legend">
        {percent}%{hasPassing && ` · o'tish bali ${passing}`}
      </span>
    </div>
  )
}
