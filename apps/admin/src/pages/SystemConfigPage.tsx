/* ============================================================
 * P0-7 · 系统设置占位页（P4 阶段细化）
 * ============================================================ */

import { Card, Typography } from 'antd';

const { Title } = Typography;

export default function SystemConfigPage() {
  return (
    <div>
      <Title level={2}>系统设置</Title>
      <Card>
        <p>系统设置将在后续阶段实现：站点配置 / 敏感词库 / 操作日志。</p>
      </Card>
    </div>
  );
}
