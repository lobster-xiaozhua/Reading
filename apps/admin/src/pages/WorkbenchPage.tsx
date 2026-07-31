/* ============================================================
 * P0-7 · 工作台占位页（P4-2 阶段细化）
 * ============================================================ */

import { Card, Typography } from 'antd';

const { Title } = Typography;

export default function WorkbenchPage() {
  return (
    <div>
      <Title level={2}>工作台</Title>
      <Card>
        <p>工作台将在 P4-2 阶段实现：</p>
        <ul>
          <li>KPI 概览卡片（作品总数 / 待审核 / 作者数 / 读者数 / 今日营收）</li>
          <li>字数产出趋势图（P7-基础图表先行支持）</li>
          <li>待办事项列表（待审核章节 / 申诉处理 / 合同到期提醒）</li>
          <li>快捷操作入口</li>
        </ul>
      </Card>
    </div>
  );
}
