import type { ReactNode } from 'react'

import { Facts } from './exam/Facts'

interface FeaturedBlockProps {
  /** Yuqoridagi amber teg: "Hozir", "Faol imtihon" */
  tag: string
  title: ReactNode
  description?: ReactNode
  facts: { label: string; value: ReactNode }[]
  /** O'ng pastki burchak: izoh va asosiy tugma */
  aside?: ReactNode
}

/**
 * Dizayndagi ink fonli asosiy blok (Talaba · Bosh sahifa → "Faol imtihon"):
 * sahifadagi eng muhim narsa — hozirgi dars, faol imtihon.
 */
export function FeaturedBlock({ tag, title, description, facts, aside }: FeaturedBlockProps) {
  return (
    <article className="ee-inverse" style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      <div
        style={{
          flex: '999 1 320px',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <span
          className="ee-tag"
          style={{
            alignSelf: 'flex-start',
            background: 'var(--ee-white)',
            color: 'var(--ee-accent-2)',
          }}
        >
          {tag}
        </span>
        <h2
          style={{
            margin: 0,
            font: '800 26px/32px var(--ee-font)',
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </h2>
        {description && (
          <p style={{ margin: 0, opacity: 0.8, whiteSpace: 'pre-line' }}>{description}</p>
        )}
        <Facts
          style={{ marginTop: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}
          items={facts}
        />
      </div>
      {aside && (
        <div
          style={{
            flex: '1 1 200px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          {aside}
        </div>
      )}
    </article>
  )
}
