/* ============================================================
 * P11 · BrandResult · 品牌化错误/空状态容器
 * 用于 403/404/500/Empty 等用户离场页面，统一品牌锚点。
 * Source: 报告 #5
 * ============================================================ */

import type { ReactNode } from "react";
import { Result } from "antd";
import type { ResultProps } from "antd";

export interface BrandResultProps extends Omit<ResultProps, "icon"> {
  /** 标题 */
  title?: ReactNode;
  /** 副标题 */
  subTitle?: ReactNode;
  /** 额外操作按钮 */
  extra?: ReactNode;
  /** 状态码 */
  status?: ResultProps["status"];
}

export function BrandResult(props: BrandResultProps) {
  const { title, subTitle, extra, status, ...rest } = props;
  return (
    <div className="b-brand-result">
      <div className="b-brand-result__halo" aria-hidden />
      <div className="b-brand-result__panel">
        <Result
          status={status}
          title={title}
          subTitle={subTitle}
          extra={extra}
          {...rest}
        />
      </div>
    </div>
  );
}
