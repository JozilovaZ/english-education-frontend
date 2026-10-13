import { App, Button, Card, Form, Input } from 'antd'

import { useUserChangePasswordCreate } from '@/shared/api/generated/endpoints/auth/auth'
import type { ChangePassword } from '@/shared/api/generated/model'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'

export function ChangePasswordPage() {
  const [form] = Form.useForm<ChangePassword>()
  const changePassword = useUserChangePasswordCreate()
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()

  const onFinish = (values: ChangePassword) => {
    changePassword.mutate(
      { data: values },
      {
        onSuccess: () => {
          form.resetFields()
          message.success("Parol muvaffaqiyatli o'zgartirildi")
        },
        onError: (error) => handleError(error, form),
      },
    )
  }

  return (
    <Card title="Parolni o'zgartirish" style={{ maxWidth: 480 }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="old_password"
          label="Joriy parol"
          rules={[{ required: true, message: 'Joriy parolni kiriting' }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="new_password"
          label="Yangi parol"
          rules={[
            { required: true, message: 'Yangi parolni kiriting' },
            { min: 8, message: "Kamida 8 ta belgi bo'lsin" },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="new_password_confirm"
          label="Yangi parolni tasdiqlang"
          dependencies={['new_password']}
          rules={[
            { required: true, message: 'Parolni qayta kiriting' },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue('new_password') === value
                  ? Promise.resolve()
                  : Promise.reject(new Error('Parollar mos emas')),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={changePassword.isPending}>
          Saqlash
        </Button>
      </Form>
    </Card>
  )
}
