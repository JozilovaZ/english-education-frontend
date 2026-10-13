import type { CSSProperties, ReactNode } from 'react'

interface FactsProps {
  items: { label: string; value: ReactNode }[]
  /** Kartochka ichida — kichikroq qiymatlar */
  size?: 'md' | 'sm'
  style?: CSSProperties
}

/** Yorliq + mono qiymat qatori: DEADLINE / VAQT / O'TISH BALI / SAVOLLAR */
export function Facts({ items, size = 'md', style }: FactsProps) {
  return (
    <dl className={`ee-facts${size === 'sm' ? ' ee-facts--sm' : ''}`} style={style}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
