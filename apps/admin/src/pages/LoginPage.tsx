import { useState } from 'react';
import { Form, Input, Button, Checkbox, Card, App, Typography, Tag } from 'antd';
import { LockOutlined, UserOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import type { LoginCredentials } from '@/api/types';

const { Title, Text } = Typography;

const DEMO_ACCOUNTS = [
  { label: '管理员', username: 'admin', password: 'admin123' },
  { label: '内容管理员', username: 'content', password: 'content123' },
  { label: '审核员', username: 'auditor', password: 'auditor123' },
  { label: '运营', username: 'operation', password: 'operation123' },
];

export default function LoginPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { message } = App.useApp();

  const onFinish = async (values: LoginCredentials) => {
    setLoading(true);
    try {
      await login(values);
      message.success(t('login:message.success'));
      const redirect = searchParams.get('redirect');
      navigate(redirect ? decodeURIComponent(redirect) : '/workbench', { replace: true });
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      if (e?.status === 401 || e?.status === 403) {
        message.error(t('login:message.authFailed'));
      } else if (e?.message?.includes('NetworkError') || e?.message?.includes('Failed to fetch')) {
        message.error(t('login:message.networkError'));
      } else {
        message.error(e?.message || t('login:message.failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (username: string, password: string) => {
    form.setFieldsValue({ username, password });
  };

  return (
    <div
      className="login-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-page)',
      }}
    >
      <Card
        style={{ width: 400, boxShadow: 'var(--sh-3)' }}
        styles={{ body: { padding: 'var(--space-8)' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ fontSize: 40, color: 'var(--color-brand)', marginBottom: 'var(--space-3)' }}>
            <BookOutlined />
          </div>
          <Title level={2} style={{ marginBottom: 'var(--space-2)' }}>
            {t('login:title')}
          </Title>
          <Text type="secondary">{t('login:subtitle')}</Text>
        </div>

        <Form<LoginCredentials>
          form={form}
          name="login"
          layout="vertical"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            label={t('login:username')}
            name="username"
            rules={[
              { required: true, message: t('login:usernameRequired') },
              { min: 4, max: 20, message: t('login:usernameLength') },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('login:usernamePlaceholder')}
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            label={t('login:password')}
            name="password"
            rules={[
              { required: true, message: t('login:passwordRequired') },
              { min: 6, max: 32, message: t('login:passwordLength') },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('login:passwordPlaceholder')}
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>{t('login:rememberMe')}</Checkbox>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              {t('login:login')}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 'var(--space-2)' }}>
            {t('login:demoAccount')}
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <div key={acc.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
                <span>{acc.label}: {acc.username} / {acc.password}</span>
                <Tag
                  color="blue"
                  style={{ cursor: 'pointer', fontSize: 11 }}
                  onClick={() => fillDemoAccount(acc.username, acc.password)}
                >
                  {t('login:fill')}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}