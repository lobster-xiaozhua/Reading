import { type ComponentProps, type ComponentRef, type ForwardRefExoticComponent, type RefAttributes } from "react";
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
export declare const BForm: ForwardRefExoticComponent<BFormProps & RefAttributes<ComponentRef<typeof AntForm>>>;
export declare const useForm: typeof import("antd/es/form/Form").useForm;
export declare const FormProvider: import("react").FC<import("antd/es/form/context").FormProviderProps>;
export type { FormInstance } from "antd";
//# sourceMappingURL=BForm.d.ts.map