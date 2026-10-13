import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Button, Dropdown, Tooltip } from 'antd'

import { useResolvedThemeMode, useThemeModeStore, type ThemePreference } from '@/app/themeMode'

const OPTIONS: { key: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { key: 'light', label: "Yorug'", icon: <SunOutlined /> },
  { key: 'dark', label: "Qorong'i", icon: <MoonOutlined /> },
  { key: 'system', label: "Tizim bo'yicha", icon: <DesktopOutlined /> },
]

export function ThemeToggle() {
  const preference = useThemeModeStore((s) => s.preference)
  const setPreference = useThemeModeStore((s) => s.setPreference)
  const mode = useResolvedThemeMode()

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        selectable: true,
        selectedKeys: [preference],
        items: OPTIONS.map((o) => ({ key: o.key, label: o.label, icon: o.icon })),
        onClick: ({ key }) => setPreference(key as ThemePreference),
      }}
    >
      <Tooltip title="Ko'rinish">
        <Button
          type="text"
          icon={mode === 'dark' ? <MoonOutlined /> : <SunOutlined />}
          aria-label="Ko'rinishni tanlash"
        />
      </Tooltip>
    </Dropdown>
  )
}
