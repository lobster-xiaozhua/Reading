/* ============================================================
 * P0-13 · 登录页
 * - AntD Form + Input + Button
 * - 用户名 + 密码 + 记住我
 * - 校验：用户名 4-20 字符、密码 6-32 字符
 * - 提交成功跳转 redirect 参数或默认 /workbench
 * ============================================================ */

import { useState } from 'react';
import { Form, Input, Button, Checkbox, Card, App, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { LoginCredentials } from '@/api/types';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { message } = App.useApp();

  const onFinish = async (values: LoginCredentials) => {
    setLoading(true);
    try {
      await login(values);
      message.success('登录成功');
      const redirect = searchParams.get('redirect');
      navigate(redirect ? decodeURIComponent(redirect) : '/workbench', { replace: true });
    } catch (err: any) {
      message.error(err?.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
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
          <Title level={2} style={{ marginBottom: 'var(--space-2)' }}>
            Atlas 运营后台
          </Title>
          <Text type="secondary">小说运营管理系统</Text>
        </div>

        <Form<LoginCredentials>
          name="login"
          layout="vertical"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 4, max: 20, message: '用户名长度 4-20 字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, max: 32, message: '密码长度 6-32 字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>记住我（7 天免登录）</Checkbox>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 'var(--space-2)' }}>
            演示账号（P6 多角色）：
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            <span>admin / admin123（超级管理员）</span>
            <span>content / content123（内容管理员）</span>
            <span>auditor / auditor123（审核员）</span>
            <span>operation / operation123（运营管理员）</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
