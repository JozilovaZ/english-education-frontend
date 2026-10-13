import { App, Button, Flex, Form, Modal, type FormInstance } from 'antd'
import { useEffect, type ReactNode } from 'react'

interface FormDrawerProps<V> {
  open: boolean
  title: ReactNode
  form: FormInstance<V>
  onClose: () => void
  onSubmit: (values: V) => void
  submitting?: boolean
  /** Tahrirlashda formaga yuklanadigan boshlang'ich qiymatlar */
  initialValues?: Partial<V>
  submitText?: string
  width?: number
  /** Maydon o'zgarganda (masalan, ismdan loginni avtomatik tuzish) */
  onValuesChange?: (changed: Partial<V>, all: V) => void
  /** Pastki chap burchak: masalan, "O'chirish" tugmasi */
  footerExtra?: ReactNode
  children: ReactNode
}

/**
 * Yaratish / tahrirlash formasi — ekran o'rtasidagi oyna (foydalanuvchi tanlovi; nomi tarixiy).
 *  - ochilganda `initialValues` yuklanadi, yopilganda forma tozalanadi
 *  - saqlanmagan o'zgarishlar bo'lsa yopishdan oldin so'raydi
 *  - backend maydon xatolari `useApiErrorHandler(error, form)` orqali inputlar ostida chiqadi
 */
export function FormDrawer<V extends object>({
  open,
  title,
  form,
  onClose,
  onSubmit,
  submitting,
  initialValues,
  submitText = 'Saqlash',
  width = 480,
  footerExtra,
  onValuesChange,
  children,
}: FormDrawerProps<V>) {
  const { modal } = App.useApp()

  useEffect(() => {
    if (!open) return
    form.resetFields()
    if (initialValues)
      form.setFieldsValue(initialValues as Parameters<typeof form.setFieldsValue>[0])
  }, [open, initialValues, form])

  const requestClose = () => {
    if (submitting) return
    if (!form.isFieldsTouched()) {
      onClose()
      return
    }
    modal.confirm({
      title: "O'zgarishlar saqlanmagan",
      content: "Formani yopsangiz kiritilgan ma'lumotlar yo'qoladi.",
      okText: 'Yopish',
      okButtonProps: { danger: true },
      cancelText: 'Davom etish',
      onOk: onClose,
    })
  }

  return (
    <Modal
      open={open}
      title={title}
      width={width}
      centered
      onCancel={requestClose}
      destroyOnHidden
      className="ee-form-modal"
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: 4 } }}
      footer={
        <Flex justify="flex-end" gap={8}>
          {footerExtra && <div style={{ marginRight: 'auto' }}>{footerExtra}</div>}
          <Button onClick={requestClose} disabled={submitting}>
            Bekor qilish
          </Button>
          <Button type="primary" loading={submitting} onClick={() => form.submit()}>
            {submitText}
          </Button>
        </Flex>
      }
    >
      <Form<V>
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        onValuesChange={onValuesChange}
        disabled={submitting}
      >
        {children}
      </Form>
    </Modal>
  )
}
