import { Button, Result } from 'antd'
import { isAxiosError } from 'axios'

import { parseApiError } from '@/shared/api/errors'

interface QueryErrorProps {
  error: unknown
  onRetry?: () => void
}

/** So'rov xatosini ko'rsatadi: 403 — ruxsat yo'q, 404 — topilmadi, qolgani — qayta urinish tugmasi */
export function QueryError({ error, onRetry }: QueryErrorProps) {
  const status = isAxiosError(error) ? error.response?.status : undefined
  const { message } = parseApiError(error)

  if (status === 403) {
    return <Result status="403" title="Ruxsat yo'q" subTitle={message} />
  }
  if (status === 404) {
    return <Result status="404" title="Topilmadi" subTitle={message} />
  }
  return (
    <Result
      status="error"
      title="Ma'lumotni yuklab bo'lmadi"
      subTitle={message}
      extra={
        onRetry && (
          <Button type="primary" onClick={onRetry}>
            Qayta urinish
          </Button>
        )
      }
    />
  )
}
