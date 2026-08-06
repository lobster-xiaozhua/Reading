/* ============================================================
 * P2-8 · BForm · B 端表单封装
 * 基于 Ant Design Form，设置 B 端默认值（vertical 布局、校验时机、错误滚动）。
 * Source: 04-B端开发计划.md P2-8
 * ============================================================ */

import {
  forwardRef,
  type ComponentProps,
  type ComponentRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import { Form as AntForm } from "antd";

export type BFormProps = ComponentProps<typeof AntForm>;

/**
 * B 端表单。
 *
 * B 端默认：
 * - layout='vertical'
 * - validateTrigger=['onBlur','onChange']
 * - scrollToFirstError={true}（onFinishFailed 时自动滚动到首个错误字段）
 *
 * 透传其余 AntD Form props。useForm / FormProvider / FormInstance 见文件末尾重新导出。
 */
export const BForm: ForwardRefExoticComponent<
  BFormProps & RefAttributes<ComponentRef<typeof AntForm>>
> = forwardRef<ComponentRef<typeof AntForm>, BFormProps>(
  (
    {
      layout = "vertical",
      validateTrigger = ["onBlur", "onChange"],
      scrollToFirstError = true,
      ...rest
    },
    ref,
  ) => (
    <AntForm
      ref={ref}
      layout={layout}
      validateTrigger={validateTrigger}
      scrollToFirstError={scrollToFirstError}
      {...rest}
    />
  ),
);

BForm.displayName = "BForm";

// 重新导出 AntD Form 的 hook / Provider / 类型，供 B 端业务直接使用
export const useForm = AntForm.useForm;
export const FormProvider = AntForm.Provider;
export type { FormInstance } from "antd";
