import { DeleteOutlined, PaperClipOutlined, UploadOutlined } from '@ant-design/icons'
import { App, Button, Flex, Typography, Upload } from 'antd'

import type { FileValue } from './fileValue'

interface FileUploadProps {
  value?: FileValue
  onChange?: (value: FileValue) => void
  /** Ruxsat etilgan kengaytmalar: ['.pdf', '.doc', '.docx'] */
  accept?: string[]
  maxSizeMB?: number
  disabled?: boolean
  buttonText?: string
}

function fileNameFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url, window.location.origin).pathname.split('/').pop() ?? url)
  } catch {
    return url
  }
}

export function FileUpload({
  value,
  onChange,
  accept,
  maxSizeMB,
  disabled,
  buttonText = 'Fayl tanlash',
}: FileUploadProps) {
  const { message } = App.useApp()

  const beforeUpload = (file: File) => {
    const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
    if (accept && !accept.includes(ext)) {
      message.error(`Faqat ${accept.join(', ')} fayllar ruxsat etiladi`)
      return Upload.LIST_IGNORE
    }
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      message.error(`Fayl hajmi ${maxSizeMB} MB dan oshmasligi kerak`)
      return Upload.LIST_IGNORE
    }
    onChange?.(file)
    // false — antd o'zi yuklamaydi, fayl forma bilan birga yuboriladi
    return false
  }

  const hint = [accept?.join(', '), maxSizeMB && `maks. ${maxSizeMB} MB`]
    .filter(Boolean)
    .join(' · ')

  return (
    <div>
      {value ? (
        <Flex align="center" gap={8}>
          <PaperClipOutlined />
          {typeof value === 'string' ? (
            <Typography.Link href={value} target="_blank" ellipsis style={{ maxWidth: 300 }}>
              {fileNameFromUrl(value)}
            </Typography.Link>
          ) : (
            <Typography.Text ellipsis style={{ maxWidth: 300 }}>
              {value.name}
            </Typography.Text>
          )}
          {!disabled && (
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onChange?.(null)}
              aria-label="Faylni olib tashlash"
            />
          )}
        </Flex>
      ) : (
        <Upload
          beforeUpload={beforeUpload}
          showUploadList={false}
          maxCount={1}
          accept={accept?.join(',')}
          disabled={disabled}
        >
          <Button icon={<UploadOutlined />} disabled={disabled}>
            {buttonText}
          </Button>
        </Upload>
      )}
      {hint && (
        <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
          {hint}
        </Typography.Text>
      )}
    </div>
  )
}
