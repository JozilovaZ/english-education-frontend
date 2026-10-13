import { Button, Card, Descriptions, Form, Input, Skeleton, App } from 'antd'
import { useEffect } from 'react'

import {
  getUserMeRetrieveQueryKey,
  useUserMePartialUpdate,
  useUserMeRetrieve,
} from '@/shared/api/generated/endpoints/users/users'
import type { PatchedUser } from '@/shared/api/generated/model'
import { useApiErrorHandler } from '@/shared/lib/useApiErrorHandler'
import { queryClient } from '@/app/queryClient'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  TEACHER: "O'qituvchi",
  STUDENT: "O'quvchi",
}

type ProfileForm = Pick<PatchedUser, 'first_name' | 'last_name' | 'email' | 'phone'>

export function ProfilePage() {
  const { data: me, isLoading } = useUserMeRetrieve()
  const update = useUserMePartialUpdate()
  const [form] = Form.useForm<ProfileForm>()
  const handleError = useApiErrorHandler()
  const { message } = App.useApp()

  useEffect(() => {
    if (me) form.setFieldsValue(me)
  }, [me, form])

  if (isLoading || !me) return <Skeleton active />

  const onFinish = (values: ProfileForm) => {
    update.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getUserMeRetrieveQueryKey(), data)
          message.success('Profil saqlandi')
        },
        onError: (error) => handleError(error, form),
      },
    )
  }

  return (
    <Card title="Profil" style={{ maxWidth: 640 }}>
      <Descriptions column={1} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Login">{me.username}</Descriptions.Item>
        <Descriptions.Item label="Rol">{me.role ? ROLE_LABELS[me.role] : '—'}</Descriptions.Item>
      </Descriptions>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="first_name" label="Ism">
          <Input />
        </Form.Item>
        <Form.Item name="last_name" label="Familiya">
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="Telefon" rules={[{ required: true }]}>
          <Input placeholder="+998901234567" />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
          <Input />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={update.isPending}>
          Saqlash
        </Button>
      </Form>
    </Card>
  )
}
