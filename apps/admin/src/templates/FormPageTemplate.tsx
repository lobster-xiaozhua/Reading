/* ============================================================
 * P3-4 · 表单页模板 FormPageTemplate
 * PageHeader + Form（vertical）+ 内容区 720px 居中 + 底部固定提交条
 * 状态变体：编辑回填 / 提交中 / 校验失败 / 提交成功
 * Source: 04 §5.4（表单页所有断点保持 720px 居中，不随屏幕拉伸）
 * ============================================================ */

import { useTranslation } from "react-i18next";
import { Form, Button, Space, Result, Skeleton, Affix } from "antd";
import type { FormInstance } from "antd";
import { CheckOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";
import { BPageHeader } from "@novel/b-end";
import type { BPageHeaderProps } from "@novel/b-end";

export type FormPageStatus = "loading" | "editing" | "submitting" | "success";

export interface FormPageTemplateProps {
  /** 页面标题 */
  title: string;
  /** 面包屑 */
  breadcrumb?: BPageHeaderProps["breadcrumb"];
  /** 返回回调 */
  onBack?: BPageHeaderProps["onBack"];

  /** 状态 */
  status: FormPageStatus;

  /* ---------- Form ---------- */
  /** AntD Form 实例（由外部创建并传入，便于控制回填与提交） */
  form: FormInstance;
  /** 表单初始值（编辑回填） */
  initialValues?: Record<string, unknown>;
  /** 表单提交回调 */
  onFinish: (values: Record<string, unknown>) => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
  /** 提交成功后的「继续操作」回调 */
  onSuccessContinue?: () => void;

  /* ---------- 按钮文案 ---------- */
  /** 提交按钮文案，默认"提交" */
  submitText?: string;
  /** 草稿按钮文案，默认"保存草稿" */
  draftText?: string;
  /** 是否显示保存草稿按钮 */
  showDraft?: boolean;
  /** 保存草稿回调 */
  onDraft?: () => void;

  /* ---------- 内容槽位 ---------- */
  children: React.ReactNode;
}

/**
 * B 端表单页模板
 * - 内容区 720px 居中，所有断点不拉伸（04 §5.4.3）
 * - Form vertical layout
 * - 底部固定提交条（Affix）
 * - 校验失败自动滚动到首个错误字段（BForm 默认行为）
 * - 提交成功显示 Result
 */
export function FormPageTemplate(props: FormPageTemplateProps) {
  const { t } = useTranslation();
  const {
    title,
    breadcrumb,
    onBack,
    status,
    form,
    initialValues,
    onFinish,
    onCancel,
    onSuccessContinue,
    submitText,
    draftText,
    showDraft = false,
    onDraft,
    children,
  } = props;

  const resolvedSubmitText = submitText ?? t("formPage:submit");
  const resolvedDraftText = draftText ?? t("formPage:saveDraft");

  // 提交成功态
  if (status === "success") {
    return (
      <div className="b-form-page">
        <BPageHeader title={title} breadcrumb={breadcrumb} onBack={onBack} />
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            paddingTop: "var(--space-8)",
          }}
        >
          <Result
            status="success"
            title={t("formPage:submitSuccess")}
            subTitle={t("formPage:submitSuccessDesc")}
            extra={
              <Space>
                <Button type="primary" onClick={onSuccessContinue}>
                  {t("formPage:continueAction")}
                </Button>
                {onBack && <Button onClick={onBack}>{t("formPage:backToList")}</Button>}
              </Space>
            }
          />
        </div>
      </div>
    );
  }

  const isSubmitting = status === "submitting";
  const isLoading = status === "loading";

  return (
    <div className="b-form-page">
      <BPageHeader title={title} breadcrumb={breadcrumb} onBack={onBack} />

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : (
          <Form
            form={form}
            layout="vertical"
            initialValues={initialValues}
            onFinish={onFinish}
            onFinishFailed={(errorInfo) => {
              // 自动滚动到首个错误字段（BForm scrollToFirstError 已处理，这里做兜底）
              if (errorInfo.errorFields.length > 0) {
                const firstError = errorInfo.errorFields[0]!;
                if (firstError) form.scrollToField(firstError.name);
              }
            }}
            requiredMark="optional"
          >
            {children}

            {/* 底部固定提交条 */}
            <Affix offsetBottom={0}>
              <div
                className="b-form-page__footer"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-3) var(--space-5)",
                  background: "var(--color-bg-elevated)",
                  borderTop: "1px solid var(--color-border-subtle)",
                  boxShadow: "var(--sh-2)",
                  margin:
                    "var(--space-5) calc(var(--space-5) * -1) calc(var(--space-5) * -1)",
                }}
                role="toolbar"
                aria-label={t("formPage:formActions")}
              >
                {onCancel && (
                  <Button
                    icon={<CloseOutlined />}
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
{t("formPage:cancel")}
                  </Button>
                )}
                {showDraft && onDraft && (
                  <Button
                    icon={<SaveOutlined />}
                    onClick={onDraft}
                    disabled={isSubmitting}
                  >
                    {resolvedDraftText}
                  </Button>
                )}
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<CheckOutlined />}
                  loading={isSubmitting}
                  data-save-btn
                >
                  {resolvedSubmitText}
                </Button>
              </div>
            </Affix>
          </Form>
        )}
      </div>
    </div>
  );
}
