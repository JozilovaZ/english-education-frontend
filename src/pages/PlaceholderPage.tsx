import { Card, Result } from 'antd'

/** Hali yozilmagan sahifalar uchun vaqtinchalik komponent */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Card title={title}>
      <Result status="info" title={title} subTitle="Bu bo'lim keyingi bosqichlarda yoziladi." />
    </Card>
  )
}
