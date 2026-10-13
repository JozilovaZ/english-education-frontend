import {
  BankOutlined,
  CheckOutlined,
  DownOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SearchOutlined,
  SunOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  AutoComplete,
  Button,
  Drawer,
  Dropdown,
  Flex,
  Grid,
  Input,
  Layout,
  Menu,
  Spin,
  Tooltip,
  type MenuProps,
  type RefSelectProps,
} from 'antd'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'

import { AREAS } from '@/app/navigation/areas'
import { useResolvedThemeMode, useThemeModeStore, type ThemePreference } from '@/app/themeMode'
import { logout } from '@/features/auth/api'
import type { Area } from '@/features/auth/home'
import { useAuthStore } from '@/features/auth/store'
import { STATUS_MAPS } from '@/shared/ui'

import { BrandMark } from './BrandMark'

const { Sider, Content } = Layout

/** Yig'ilgan menyu holati — shu brauzerda eslab qolinadi (saqlab bo'lmasa ham ishlaydi) */
const COLLAPSE_KEY = 'ee-sider-collapsed'
function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}
function saveCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0')
  } catch {
    // Saqlash taqiqlangan (maxfiy oyna) — faqat shu sessiyada amal qiladi
  }
}

const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'light', label: "Yorug'" },
  { key: 'dark', label: "Qorong'i" },
  { key: 'system', label: "Tizim bo'yicha" },
]

/**
 * Namuna dizayn bo'yicha: chapda 260px menyu (logo, bo'limlar, pastda markaz kartochkasi),
 * yuqorida panel (bo'lim qidiruvi, ko'rinish, foydalanuvchi). Telefonda menyu yon tomondan ochiladi.
 */
export function AreaLayout({ area }: { area: Area }) {
  const config = AREAS[area]
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const location = useLocation()
  const screens = Grid.useBreakpoint()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsedPref, setCollapsedPref] = useState(readCollapsed)
  const themePreference = useThemeModeStore((s) => s.preference)
  const setThemePreference = useThemeModeStore((s) => s.setPreference)
  const mode = useResolvedThemeMode()
  // Planshet va telefonda (< 992px) chap ustun o'rniga ochiladigan menyu
  const isMobile = !screens.lg
  // Telefonda menyu doim to'liq (yon tomondan ochiladi)
  const collapsed = collapsedPref && !isMobile
  const toggleCollapsed = () => {
    setCollapsedPref((v) => {
      saveCollapsed(!v)
      return !v
    })
  }

  const items = config.items.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  )

  const base = `/${area}`
  const toPath = (path: string) => (path ? `${base}/${path}` : base)

  // Eng uzun mos keluvchi menyu bandini tanlaymiz (masalan /admin/groups/5 → groups)
  const selected =
    items
      .map((item) => toPath(item.path))
      .filter((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))
      .sort((a, b) => b.length - a.length)[0] ?? base

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username
  const initials = (fullName ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  // Public schema'dagi SUPER_ADMIN — markaz emas, butun platforma egasi
  const roleLabel =
    area === 'platform' ? 'Platforma egasi' : user ? STATUS_MAPS.role[user.role]?.label : ''
  const centerName =
    area === 'platform'
      ? 'Platforma'
      : (user?.schemaName ?? '').replace(/^./, (ch) => ch.toUpperCase()) || "O'quv markazi"

  const userMenu: MenuProps = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'Profil' },
      { key: 'password', icon: <LockOutlined />, label: "Parolni o'zgartirish" },
      {
        key: 'theme',
        label: "Ko'rinish",
        children: THEME_OPTIONS.map((o) => ({
          key: `theme:${o.key}`,
          label: o.label,
          icon: o.key === themePreference ? <CheckOutlined /> : <span style={{ width: 14 }} />,
        })),
      },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Chiqish' },
    ],
    onClick: ({ key }) => {
      setDrawerOpen(false)
      if (key === 'logout') {
        logout()
        navigate('/login', { replace: true })
      } else if (key.startsWith('theme:')) {
        setThemePreference(key.slice(6) as ThemePreference)
      } else {
        navigate(`${base}/${key}`)
      }
    },
  }

  const sider = (
    <div className={`ee-sider${collapsed ? ' ee-sider--collapsed' : ''}`}>
      <div style={{ padding: '0 4px' }}>
        <BrandMark onDark compact={collapsed} />
      </div>
      <Menu
        theme={mode}
        mode="inline"
        inlineCollapsed={collapsed}
        selectedKeys={[selected]}
        items={items.map((item) => ({
          key: toPath(item.path),
          icon: item.icon,
          label: item.label,
        }))}
        onClick={({ key }) => {
          setDrawerOpen(false)
          navigate(key)
        }}
        style={{ borderInlineEnd: 'none' }}
      />
      <div
        className="ee-sider-card"
        title={collapsed ? `${centerName} · ${config.title}` : undefined}
      >
        <span className="ee-sider-card__icon" aria-hidden>
          <BankOutlined />
        </span>
        {!collapsed && (
          <span style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {centerName}
            </strong>
            <span style={{ color: 'var(--ee-sider-text)', fontSize: 12 }}>{config.title}</span>
          </span>
        )}
      </div>
    </div>
  )

  const userButton = (
    <Dropdown trigger={['click']} placement="bottomRight" menu={userMenu}>
      <button type="button" className="ee-user-btn" aria-label="Foydalanuvchi menyusi">
        <span className="ee-avatar">{initials}</span>
        {!isMobile && (
          <>
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span className="ee-user-btn__name">{fullName}</span>
              <span className="ee-user-btn__role">{roleLabel}</span>
            </span>
            <DownOutlined style={{ fontSize: 11, color: 'var(--ee-text-3)' }} />
          </>
        )}
      </button>
    </Dropdown>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isMobile ? (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          size={280}
          closable={false}
          styles={{ body: { padding: 0, background: 'var(--ee-sider)' } }}
        >
          {sider}
        </Drawer>
      ) : (
        <Sider
          width={260}
          collapsedWidth={84}
          collapsed={collapsed}
          trigger={null}
          style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}
        >
          {sider}
        </Sider>
      )}
      <Layout style={{ minWidth: 0 }}>
        <header
          className="ee-topbar"
          style={isMobile ? { padding: '0 12px', height: 64 } : undefined}
        >
          {isMobile && (
            <>
              <Button
                type="text"
                className="ee-icon-btn"
                icon={<MenuOutlined />}
                onClick={() => setDrawerOpen(true)}
                aria-label="Menyuni ochish"
              />
              <BrandMark compact />
            </>
          )}
          {!isMobile && (
            <Tooltip title={collapsed ? 'Menyuni ochish' : "Menyuni yig'ish"}>
              <Button
                type="text"
                className="ee-icon-btn"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={toggleCollapsed}
                aria-label={collapsed ? 'Menyuni ochish' : "Menyuni yig'ish"}
                aria-expanded={!collapsed}
              />
            </Tooltip>
          )}
          {!isMobile && (
            <PageSearch
              options={items.map((item) => ({ value: toPath(item.path), label: item.label }))}
              onPick={(path) => navigate(path)}
            />
          )}
          <Flex align="center" gap={8} style={{ marginLeft: 'auto' }}>
            <Tooltip title={mode === 'dark' ? "Yorug' ko'rinish" : "Qorong'i ko'rinish"}>
              <Button
                type="text"
                className="ee-icon-btn"
                icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
                aria-label="Ko'rinishni almashtirish"
                onClick={() => setThemePreference(mode === 'dark' ? 'light' : 'dark')}
              />
            </Tooltip>
            {userButton}
          </Flex>
        </header>
        <Content style={{ minWidth: 0 }}>
          <main className="ee-wrap">
            <Suspense
              fallback={
                <Flex justify="center" style={{ padding: 48 }}>
                  <Spin size="large" />
                </Flex>
              }
            >
              <Outlet />
            </Suspense>
          </main>
        </Content>
      </Layout>
    </Layout>
  )
}

/** Bo'limlar bo'yicha tezkor qidiruv (Ctrl+K) */
function PageSearch({
  options,
  onPick,
}: {
  options: { value: string; label: string }[]
  onPick: (path: string) => void
}) {
  const [text, setText] = useState('')
  const ref = useRef<RefSelectProps>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const q = text.trim().toLowerCase()
  const shown = options.filter((o) => !q || o.label.toLowerCase().includes(q))

  return (
    <AutoComplete
      ref={ref}
      className="ee-topbar__search"
      value={text}
      options={shown}
      onChange={setText}
      onSelect={(value: string) => {
        setText('')
        ref.current?.blur()
        onPick(value)
      }}
    >
      <Input
        size="large"
        prefix={<SearchOutlined style={{ color: 'var(--ee-text-3)' }} />}
        suffix={<span className="ee-kbd">Ctrl + K</span>}
        placeholder="Bo'limni qidirish…"
        aria-label="Bo'limni qidirish"
      />
    </AutoComplete>
  )
}
