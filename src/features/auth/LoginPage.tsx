import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Form, Grid, Input, Typography } from 'antd'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { BrandMark } from '@/app/layouts/BrandMark'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'

import { useLogin, type LoginPayload } from './api'
import { getUserArea } from './home'
import { useAuthStore } from './store'

const FEATURES = [
  "Guruhlar, dars jadvali va o'quvchilar",
  'Davomat bir bosishda',
  'Uy vazifasi va imtihonlar, avtomatik baholash',
]

// Asosiy domen (subdomensiz) — bu yerda faqat platforma egasi kira oladi
const HOST = window.location.hostname.replace(/^www\./, '')
const IS_MAIN_DOMAIN = HOST.endsWith('localhost')
  ? HOST === 'localhost'
  : HOST.split('.').length <= 2 && !/^\d+\.\d+\.\d+\.\d+$/.test(HOST)
const CENTER_EXAMPLE = `${window.location.protocol}//niners.${window.location.host.replace(/^www\./, '')}`

export function LoginPage() {
  const screens = Grid.useBreakpoint()
  const [form] = Form.useForm<LoginPayload>()
  const login = useLogin()
  const handleError = useApiErrorHandler()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)

  // Allaqachon kirgan foydalanuvchi. Login jarayonida esa yo'naltirishni onSuccess bajaradi.
  if (user && login.isIdle) return <Navigate to="/" replace />

  const onFinish = (values: LoginPayload) => {
    login.mutate(
      { username: values.username.trim(), password: values.password },
      {
        onSuccess: () => {
          const from = (location.state as { from?: string } | null)?.from
          const current = useAuthStore.getState().user
          const area = current ? getUserArea(current) : null
          // Faqat o'z bo'limiga tegishli sahifaga qaytaramiz
          const target = from && area && from.startsWith(`/${area}`) ? from : '/'
          navigate(target, { replace: true })
        },
        onError: (error) => handleError(error, form),
      },
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--ee-surface)' }}>
      {screens.md && (
        <aside
          style={{
            flex: '0 0 44%',
            maxWidth: 560,
            background: 'var(--ee-sider)',
            color: 'var(--ee-sider-strong)',
            padding: '40px 48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 32,
          }}
        >
          <BrandMark onDark />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h1
              style={{
                margin: 0,
                font: '600 40px/46px var(--ee-font-serif)',
                letterSpacing: '-0.02em',
              }}
            >
              O'quv markazingiz {/* Amber — faqat to'ldirish, ustidagi matn slate */}
              <span
                style={{
                  background: 'var(--ee-accent)',
                  color: 'var(--ee-on-accent)',
                  padding: '0 8px',
                  borderRadius: 4,
                  boxDecorationBreak: 'clone',
                  WebkitBoxDecorationBreak: 'clone',
                }}
              >
                bitta tizimda
              </span>
            </h1>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
              {FEATURES.map((f) => (
                <li
                  key={f}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'baseline',
                    color: 'var(--ee-sider-text)',
                  }}
                >
                  <span aria-hidden style={{ color: 'var(--ee-sider-strong)', fontWeight: 700 }}>
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <span style={{ fontSize: 13, color: 'var(--ee-sider-text)' }}>
            Ota-onalar natijalarni Telegram bot orqali oladi
          </span>
        </aside>
      )}

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--ee-surface)',
          borderLeft: '1px solid var(--ee-border)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 380,
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
          }}
        >
          {!screens.md && <BrandMark />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 className="ee-title">Tizimga kirish</h2>
            <span className="ee-muted">
              Markaz bergan login yoki telefon raqamingiz bilan kiring
            </span>
          </div>
          {IS_MAIN_DOMAIN && (
            <div
              role="note"
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'var(--ee-warning-soft)',
                color: 'var(--ee-warning-text)',
                fontSize: 13,
                lineHeight: '18px',
              }}
            >
              Bu <strong>platforma egasi</strong> uchun kirish. Markaz admini, o'qituvchi va
              o'quvchilar o'z markazi manzilidan kiradi, masalan:{' '}
              <a href={CENTER_EXAMPLE} style={{ color: 'inherit', fontWeight: 700 }}>
                {CENTER_EXAMPLE.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
            <Form.Item
              name="username"
              label="Login yoki telefon raqam"
              rules={[{ required: true, whitespace: true, message: 'Loginni kiriting' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="username yoki +998901234567"
                autoComplete="username"
                autoFocus
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="Parol"
              rules={[{ required: true, message: 'Parolni kiriting' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Parol"
                autoComplete="current-password"
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={login.isPending}
              className="ee-btn-accent"
            >
              Kirish
            </Button>
          </Form>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Parolni unutgan bo'lsangiz, markaz administratoriga murojaat qiling.
          </Typography.Text>
        </div>
      </main>
    </div>
  )
}
