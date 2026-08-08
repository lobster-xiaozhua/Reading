import { useState } from "react";
import {
  Form,
  Input,
  Button,
  Checkbox,
  Card,
  App,
  Typography,
  Tag,
} from "antd";
import {
  LockOutlined,
  UserOutlined,
  BookOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import type { LoginCredentials } from "@/api/types";
import "./LoginPage.css";

const { Title, Text } = Typography;

const DEMO_ACCOUNTS = [
  { label: "管理员", username: "admin", password: "admin123" },
  { label: "内容管理员", username: "content", password: "content123" },
  { label: "审核员", username: "auditor", password: "auditor123" },
  { label: "运营", username: "operation", password: "operation123" },
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
      message.success(t("login:message.success"));
      const redirect = searchParams.get("redirect");
      navigate(redirect ? decodeURIComponent(redirect) : "/workbench", {
        replace: true,
      });
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      if (e?.status === 401 || e?.status === 403) {
        message.error(t("login:message.authFailed"));
      } else if (
        e?.message?.includes("NetworkError") ||
        e?.message?.includes("Failed to fetch")
      ) {
        message.error(t("login:message.networkError"));
      } else {
        message.error(e?.message || t("login:message.failed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (username: string, password: string) => {
    form.setFieldsValue({ username, password });
  };

  return (
    <div className="login-page">
      {/* 装饰光晕 */}
      <div className="login-orb login-orb--a" aria-hidden />
      <div className="login-orb login-orb--b" aria-hidden />

      {/* 左侧品牌区 */}
      <div className="login-brand">
        <div className="login-brand__badge">
          <BookOutlined aria-hidden="true" />
        </div>
        <h1 className="login-brand__title">Atlas 小说管理平台</h1>
        <p className="login-brand__desc">
          一体化作品管理、内容审核与数据运营中枢
        </p>
        <ul className="login-brand__features">
          <li>
            <BarChartOutlined aria-hidden="true" />
            <span>多维度经营数据看板</span>
          </li>
          <li>
            <AuditOutlined aria-hidden="true" />
            <span>全流程内容审核工作台</span>
          </li>
          <li>
            <SafetyCertificateOutlined aria-hidden="true" />
            <span>细粒度角色与权限体系</span>
          </li>
        </ul>
      </div>

      {/* 右侧登录表单 */}
      <div className="login-panel">
        <Card
          className="login-card"
          styles={{ body: { padding: "var(--space-8)" } }}
        >
          <div className="login-card__header">
            <Title level={3} className="login-card__title">
              {t("login:title")}
            </Title>
            <Text type="secondary">{t("login:subtitle")}</Text>
          </div>

          <Form<LoginCredentials>
            form={form}
            name="login"
            layout="vertical"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            autoComplete="off"
            requiredMark={false}
          >
            <Form.Item
              label={t("login:username")}
              name="username"
              rules={[
                { required: true, message: t("login:usernameRequired") },
                { min: 4, max: 20, message: t("login:usernameLength") },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder={t("login:usernamePlaceholder")}
                autoComplete="username"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label={t("login:password")}
              name="password"
              rules={[
                { required: true, message: t("login:passwordRequired") },
                { min: 6, max: 32, message: t("login:passwordLength") },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t("login:passwordPlaceholder")}
                autoComplete="current-password"
                size="large"
              />
            </Form.Item>

            <Form.Item name="remember" valuePropName="checked">
              <Checkbox>{t("login:rememberMe")}</Checkbox>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
              >
                {t("login:login")}
              </Button>
            </Form.Item>
          </Form>

          <div className="login-card__demo">
            <Text
              type="secondary"
              className="login-card__demo-label"
            >
              {t("login:demoAccount")}
            </Text>
            <div className="login-card__demo-list">
              {DEMO_ACCOUNTS.map((acc) => (
                <div
                  key={acc.label}
                  className="demo-account-item login-card__demo-row"
                >
                  <span className="login-card__demo-info">
                    {acc.label}: {acc.username} / {acc.password}
                  </span>
                  <Tag
                    color="blue"
                    className="login-card__demo-fill"
                    onClick={() => fillDemoAccount(acc.username, acc.password)}
                  >
                    {t("login:fill")}
                  </Tag>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
