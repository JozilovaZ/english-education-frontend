import {
  BankOutlined,
  BarChartOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  ReadOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'

import type { Area } from '@/features/auth/home'
import type { Role } from '@/features/auth/types'

export interface NavItem {
  /** Bo'lim ichidagi nisbiy yo'l ('' — bosh sahifa) */
  path: string
  label: string
  icon: ReactNode
  /** Faqat shu rollarga ko'rinadi (berilmasa — bo'limdagi hammaga) */
  roles?: Role[]
}

export interface AreaConfig {
  title: string
  items: NavItem[]
}

/**
 * Har bir rol uchun menyu. Yangi sahifa qo'shilganda shu yerga yoziladi,
 * router (src/app/router.tsx) ham shu ro'yxatdan quriladi.
 */
export const AREAS: Record<Area, AreaConfig> = {
  platform: {
    title: 'Platforma boshqaruvi',
    items: [
      { path: '', label: 'Statistika', icon: <DashboardOutlined /> },
      { path: 'tenants', label: "O'quv markazlari", icon: <BankOutlined /> },
      { path: 'domains', label: 'Domenlar', icon: <GlobalOutlined /> },
    ],
  },
  admin: {
    title: 'Administrator',
    items: [
      { path: '', label: 'Bosh sahifa', icon: <DashboardOutlined /> },
      { path: 'users', label: 'Foydalanuvchilar', icon: <UserOutlined /> },
      // Backend: kurslar faqat SUPER_ADMIN uchun (BACKEND_ISSUES #6)
      { path: 'courses', label: 'Kurslar', icon: <BookOutlined />, roles: ['SUPER_ADMIN'] },
      { path: 'groups', label: 'Guruhlar', icon: <TeamOutlined /> },
      { path: 'schedules', label: 'Dars jadvali', icon: <CalendarOutlined /> },
      { path: 'parents', label: 'Ota-onalar', icon: <UsergroupAddOutlined /> },
      { path: 'exams', label: 'Imtihonlar', icon: <TrophyOutlined /> },
    ],
  },
  teacher: {
    title: "O'qituvchi",
    // Dizayndagi tartib: Imtihonlar, Natijalar, Uy vazifalari — keyin qolgan bo'limlar
    items: [
      { path: '', label: 'Bosh sahifa', icon: <DashboardOutlined /> },
      { path: 'exams', label: 'Imtihonlar', icon: <TrophyOutlined /> },
      { path: 'results', label: 'Natijalar', icon: <BarChartOutlined /> },
      { path: 'homework', label: 'Uy vazifalari', icon: <FileTextOutlined /> },
      { path: 'groups', label: 'Guruhlarim', icon: <TeamOutlined /> },
      { path: 'lessons', label: 'Darslar', icon: <ReadOutlined /> },
      { path: 'attendance', label: 'Davomat', icon: <CheckSquareOutlined /> },
      { path: 'materials', label: 'Materiallar', icon: <FolderOpenOutlined /> },
    ],
  },
  student: {
    title: "O'quvchi",
    // Tartib dizayndagidek: Bosh sahifa, Imtihonlar, Uy vazifalari, Natijalar
    items: [
      { path: '', label: 'Bosh sahifa', icon: <DashboardOutlined /> },
      { path: 'exams', label: 'Imtihonlar', icon: <TrophyOutlined /> },
      { path: 'homework', label: 'Uy vazifalari', icon: <FileTextOutlined /> },
      { path: 'results', label: 'Natijalar', icon: <BarChartOutlined /> },
      { path: 'materials', label: 'Materiallar', icon: <FolderOpenOutlined /> },
      { path: 'attendance', label: 'Davomatim', icon: <CheckSquareOutlined /> },
    ],
  },
}
