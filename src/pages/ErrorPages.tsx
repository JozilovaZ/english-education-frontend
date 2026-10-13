import { Button, Result } from 'antd'
import { useNavigate } from 'react-router'

import { logout } from '@/features/auth/api'

export function ForbiddenPage() {
  const navigate = useNavigate()
  return (
    <Result
      status="403"
      title="403"
      subTitle="Sizda bu sahifaga kirish huquqi yo'q."
      extra={[
        <Button key="home" type="primary" onClick={() => navigate('/')}>
          Bosh sahifa
        </Button>,
        <Button
          key="logout"
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
        >
          Boshqa akkaunt bilan kirish
        </Button>,
      ]}
    />
  )
}

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <Result
      status="404"
      title="404"
      subTitle="Sahifa topilmadi."
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          Bosh sahifa
        </Button>
      }
    />
  )
}
