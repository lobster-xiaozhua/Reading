/* ============================================================
 * P0-7 · 内容管理列表占位页（P4-1 阶段细化）
 * ============================================================ */

import { Card, Typography } from 'antd';

const { Title } = Typography;

export default function NovelListPage() {
  return (
    <div>
      <Title level={2}>作品管理</Title>
      <Card>
        <p>作品管理列表将在 P4-1 阶段实现：</p>
        <ul>
          <li>FilterBar（搜索 + 状态筛选 + 分类筛选 + 高级筛选）</li>
          <li>Table（封面/标题/作者/分类/字数/状态/更新时间/操作）</li>
          <li>BatchActionBar（批量上下架 / 批量删除）</li>
          <li>新建作品入口</li>
        </ul>
      </Card>
    </div>
  );
}
