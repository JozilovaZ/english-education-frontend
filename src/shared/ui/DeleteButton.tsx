import { DeleteOutlined } from '@ant-design/icons'
import { Button, Popconfirm, Tooltip } from 'antd'
import type { ReactNode } from 'react'

interface DeleteButtonProps {
  onConfirm: () => Promise<unknown>
  /** Tasdiqlash oynasidagi savol */
  title?: ReactNode
  description?: ReactNode
  /** Faqat ikonka (jadval qatorlari uchun) */
  iconOnly?: boolean
  disabled?: boolean
  disabledReason?: string
}

/**
 * O'chirish tugmasi: avval tasdiq so'raydi, so'rov tugaguncha tugma loading holatida.
 * Xatoni (masalan, "bog'langan ma'lumot bor" — ProtectedError) chaqiruvchi tomon ko'rsatadi:
 *   onConfirm={() => remove.mutateAsync({ id }).catch(handleError)}
 */
export function DeleteButton({
  onConfirm,
  title = "O'chirishni tasdiqlaysizmi?",
  description = "Bu amalni ortga qaytarib bo'lmaydi.",
  iconOnly = true,
  disabled,
  disabledReason,
}: DeleteButtonProps) {
  const button = (
    <Button
      danger
      type={iconOnly ? 'text' : 'default'}
      icon={<DeleteOutlined />}
      disabled={disabled}
      aria-label="O'chirish"
    >
      {iconOnly ? null : "O'chirish"}
    </Button>
  )

  if (disabled) {
    return disabledReason ? <Tooltip title={disabledReason}>{button}</Tooltip> : button
  }

  return (
    <Popconfirm
      title={title}
      description={description}
      okText="O'chirish"
      okButtonProps={{ danger: true }}
      cancelText="Bekor qilish"
      onConfirm={onConfirm}
    >
      <Tooltip title={iconOnly ? "O'chirish" : undefined}>{button}</Tooltip>
    </Popconfirm>
  )
}
