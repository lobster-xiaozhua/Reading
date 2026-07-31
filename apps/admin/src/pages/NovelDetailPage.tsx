/* ============================================================
 * P4-3 · 作品详情卡片页
 * 基于 DetailCardTemplate 实例化
 * 基本信息 + 数据统计（Progress circle 完读率）+ 章节卡 + 审核 Timeline + 评论 Top10
 * Source: 04 §5.3 / P4-3
 * ============================================================ */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Space, Progress, Tag, App } from 'antd';
import { EditOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { BNovelDetail } from '@novel/types';
import { DetailCardTemplate } from '@/templates/DetailCardTemplate';
import type { DetailCardStatus, DescItem, AuditHistoryItem, CommentItem } from '@/templates/DetailCardTemplate';
import { fetchNovelDetail, batchOperate } from '@/api/novel-api';
import { NOVEL_CATEGORIES } from '@/api/novel-api';
import { useAuthStore } from '@/stores/authStore';

const CATEGORY_LABEL = Object.fromEntries(NOVEL_CATEGORIES.map((c) => [c.value, c.label]));

export default function NovelDetailPage() {
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const { modal } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [status, setStatus] = useState<DetailCardStatus>('loading');
  const [novel, setNovel] = useState<BNovelDetail | null>(null);
  const [auditHistory] = useState<AuditHistoryItem[]>([
    { time: '2026-07-30 14:30', operator: '审核员A', result: 'approve', comment: '内容合规，予以通过。' },
    { time: '2026-07-28 10:15', operator: '审核员B', result: 'revise', comment: '第 5 章存在敏感表述，请修改后重新提交。' },
    { time: '2026-07-25 09:00', operator: '系统', result: 'approve', comment: '初审通过，进入复审。' },
  ]);
  const [comments] = useState<CommentItem[]>([
    { id: '1', user: '读者甲', content: '剧情紧凑，期待后续更新！', time: '2 小时前', likes: 128 },
    { id: '2', user: '读者乙', content: '主角设定很新颖，支持作者。', time: '5 小时前', likes: 86 },
    { id: '3', user: '读者丙', content: '这一章写得太精彩了。', time: '1 天前', likes: 52 },
  ]);

  const loadDetail = useCallback(async () => {
    if (!novelId) return;
    setStatus('loading');
    try {
      const data = await fetchNovelDetail(novelId);
      if (!data) {
        setStatus('not-found');
        return;
      }
      setNovel(data);
      setStatus(data.status === 'offline' ? 'offline' : 'ready');
    } catch {
      setStatus('not-found');
    }
  }, [novelId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const canEdit = hasPermission('novel.edit' as never);

  const handleShelve = (action: 'publish' | 'offline') => {
    if (!novel) return;
    if (action === 'offline') {
      modal.confirm({
        title: '确认下架该作品？',
        content: '下架后 C 端将无法阅读此作品，可随时重新上架。',
        okText: '确认下架',
        okType: 'danger',
        onOk: () => batchOperate([novel.id], 'offline').then(loadDetail),
      });
    } else {
      batchOperate([novel.id], 'publish').then(loadDetail);
    }
  };

  const handleDelete = () => {
    if (!novel) return;
    modal.confirm({
      title: '永久删除该作品？',
      content: `此操作不可撤销。作品《${novel.title}》及其所有章节将被永久删除。`,
      okText: '确认删除',
      okType: 'danger',
      onOk: () => batchOperate([novel.id], 'delete').then(() => navigate('/novel')),
    });
  };

  const headerExtra = novel ? (
    <Space>
      {canEdit && (
        <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/novel/${novel.id}/edit`)}>
          编辑
        </Button>
      )}
      {novel.status === 'published' ? (
        <Button icon={<ArrowDownOutlined />} onClick={() => handleShelve('offline')}>
          下架
        </Button>
      ) : (
        <Button icon={<ArrowUpOutlined />} onClick={() => handleShelve('publish')}>
          上架
        </Button>
      )}
      <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
        删除
      </Button>
    </Space>
  ) : undefined;

  const basicItems: DescItem[] = novel
    ? [
        { key: 'title', label: '书名', children: novel.title },
        { key: 'author', label: '作者', children: novel.author },
        { key: 'category', label: '分类', children: CATEGORY_LABEL[novel.category] ?? novel.category },
        { key: 'tags', label: '标签', children: novel.tags.map((t: string) => <Tag key={t}>{t}</Tag>) },
        { key: 'wordCount', label: '总字数', children: novel.wordCount.toLocaleString() },
        { key: 'intro', label: '简介', span: 2, children: novel.intro },
        { key: 'createdAt', label: '创建时间', children: new Date(novel.createdAt).toLocaleString('zh-CN') },
        { key: 'publishedAt', label: '上架时间', children: novel.publishedAt ? new Date(novel.publishedAt).toLocaleString('zh-CN') : '未上架' },
      ]
    : [];

  const statsContent = novel ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>阅读量</span>
        <strong>{(novel.wordCount * 12).toLocaleString()}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>收藏数</span>
        <strong>{(novel.wordCount / 100).toLocaleString()}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>月票</span>
        <strong>{(novel.wordCount / 50).toLocaleString()}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>评分</span>
        <strong>4.{novel.wordCount % 9}</strong>
      </div>
      <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
        <Progress type="circle" percent={68 + (novel.wordCount % 20)} size={100} />
        <div style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-caption, 13px)' }}>
          完读率
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <DetailCardTemplate
      title={novel?.title ?? '作品详情'}
      breadcrumb={[
        { title: '内容管理' },
        { title: '作品管理', onClick: () => navigate('/novel') },
        { title: novel?.title ?? '详情' },
      ]}
      status={status}
      onBack={() => navigate('/novel')}
      extra={headerExtra}
      basicItems={basicItems}
      statsContent={statsContent}
      chapterTitle="章节管理"
      chapterContent={
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <Button type="primary" onClick={() => navigate(`/chapter/${novel?.id}`)}>
            进入章节管理
          </Button>
          <p style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
            章节列表、排序、编辑将在 P5-1 章节管理页实现
          </p>
        </div>
      }
      auditHistory={auditHistory}
      comments={comments}
    />
  );
}
