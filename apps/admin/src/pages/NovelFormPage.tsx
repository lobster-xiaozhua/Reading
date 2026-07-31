/* ============================================================
 * P4-4 · 新建/编辑作品表单页
 * 基于 FormPageTemplate 实例化
 * 基本信息（书名/作者/分类Cascader/标签/简介）+ 封面上传 + 设置区 + 底部提交条
 * 校验：失焦 + 提交双校验，错误滚动首字段（04 §9.4）
 * Source: 04 §5.4 / P4-4
 * ============================================================ */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Select, Radio, Switch, InputNumber, Tree, Upload, Card, App } from 'antd';
import type { UploadFile } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { BNovelStatus } from '@novel/types';
import { FormPageTemplate } from '@/templates/FormPageTemplate';
import type { FormPageStatus } from '@/templates/FormPageTemplate';
import { fetchNovelDetail, submitNovel, NOVEL_CATEGORIES } from '@/api/novel-api';
import type { NovelFormValues } from '@/api/novel-api';

const { TextArea } = Input;

/** VIP 章节树 mock 数据 */
const VIP_CHAPTER_TREE = [
  {
    title: '第一卷',
    key: 'vol-1',
    children: [
      { title: '第 1 章 开篇', key: 'ch-1' },
      { title: '第 2 章 起步', key: 'ch-2' },
      { title: '第 3 章 机遇', key: 'ch-3' },
    ],
  },
  {
    title: '第二卷',
    key: 'vol-2',
    children: [
      { title: '第 4 章 转折', key: 'ch-4' },
      { title: '第 5 章 突破', key: 'ch-5' },
    ],
  },
];

const CATEGORY_CASCADER = NOVEL_CATEGORIES.filter((c) => c.value !== 'all').map((c) => ({
  value: c.value,
  label: c.label,
}));

export default function NovelFormPage() {
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<NovelFormValues>();
  const [status, setStatus] = useState<FormPageStatus>('loading');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const isEdit = Boolean(novelId);

  useEffect(() => {
    if (!isEdit) {
      setStatus('editing');
      return;
    }
    // 编辑模式：回填
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchNovelDetail(novelId!);
        if (cancelled || !data) {
          setStatus('editing');
          return;
        }
        form.setFieldsValue({
          id: data.id,
          title: data.title,
          author: data.author,
          category: data.category,
          tags: data.tags,
          intro: data.intro,
          status: data.status,
          isOnShelf: data.status === 'published',
          price: 0,
          vipChapters: [],
        });
        setStatus('editing');
      } catch {
        setStatus('editing');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [novelId, form, isEdit]);

  const handleFinish = async (values: Record<string, unknown>) => {
    setStatus('submitting');
    try {
      const formValues = values as unknown as NovelFormValues;
      formValues.id = novelId;
      await submitNovel(formValues);
      setStatus('success');
    } catch {
      message.error('提交失败，请重试');
      setStatus('editing');
    }
  };

  const handleDraft = async () => {
    const values = form.getFieldsValue();
    values.status = 'draft' as BNovelStatus;
    values.id = novelId;
    await submitNovel(values as NovelFormValues);
    message.success('草稿已保存');
  };

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件');
      return Upload.LIST_IGNORE;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('封面图片不能超过 2MB');
      return Upload.LIST_IGNORE;
    }
    return false; // 阻止自动上传，手动控制
  };

  return (
    <FormPageTemplate
      title={isEdit ? '编辑作品' : '新建作品'}
      breadcrumb={[
        { title: '内容管理' },
        { title: '作品管理', onClick: () => navigate('/novel') },
        { title: isEdit ? '编辑' : '新建' },
      ]}
      onBack={() => navigate('/novel')}
      status={status}
      form={form}
      onFinish={handleFinish}
      onCancel={() => navigate('/novel')}
      onSuccessContinue={() => {
        form.resetFields();
        setStatus('editing');
      }}
      submitText={isEdit ? '保存' : '提交'}
      showDraft
      onDraft={handleDraft}
    >
      {/* 基本信息 */}
      <Card title="基本信息" style={{ marginBottom: 'var(--space-4)' }}>
        <Form.Item
          name="title"
          label="书名"
          rules={[
            { required: true, message: '请输入书名' },
            { max: 50, message: '书名不能超过 50 字' },
          ]}
        >
          <Input placeholder="请输入书名（1-50 字）" maxLength={50} showCount />
        </Form.Item>

        <Form.Item
          name="author"
          label="作者"
          rules={[{ required: true, message: '请输入作者名' }]}
        >
          <Input placeholder="请输入作者笔名" />
        </Form.Item>

        <Form.Item
          name="category"
          label="分类"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select options={CATEGORY_CASCADER} placeholder="请选择作品分类" />
        </Form.Item>

        <Form.Item name="tags" label="标签">
          <Select
            mode="tags"
            placeholder="输入标签后回车（如：VIP、推荐、限免）"
            tokenSeparators={[',']}
          />
        </Form.Item>

        <Form.Item
          name="intro"
          label="简介"
          rules={[
            { required: true, message: '请输入作品简介' },
            { max: 500, message: '简介不能超过 500 字' },
          ]}
        >
          <TextArea
            placeholder="请输入作品简介（1-500 字）"
            rows={4}
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Card>

      {/* 封面上传 */}
      <Card title="封面" style={{ marginBottom: 'var(--space-4)' }}>
        <Form.Item name="cover" label="封面图片">
          <Upload
            listType="picture-card"
            fileList={fileList}
            beforeUpload={beforeUpload}
            onChange={({ fileList: fl }) => setFileList(fl)}
            maxCount={1}
            accept="image/*"
          >
            {fileList.length === 0 && (
              <div>
                <UploadOutlined />
                <div style={{ marginTop: 8 }}>上传封面</div>
                <div style={{ fontSize: 'var(--font-size-caption, 13px)', color: 'var(--color-text-tertiary)' }}>
                  120 × 160，≤ 2MB
                </div>
              </div>
            )}
          </Upload>
        </Form.Item>
      </Card>

      {/* 设置区 */}
      <Card title="设置" style={{ marginBottom: 'var(--space-4)' }}>
        <Form.Item name="status" label="连载状态" initialValue="draft">
          <Radio.Group>
            <Radio value="draft">草稿</Radio>
            <Radio value="pending">提交审核</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="isOnShelf" label="上架" valuePropName="checked" initialValue={false}>
          <Switch />
        </Form.Item>

        <Form.Item name="price" label="定价（书币/千字）" initialValue={0}>
          <InputNumber min={0} max={9999} step={10} style={{ width: 200 }} />
        </Form.Item>

        <Form.Item name="vipChapters" label="VIP 章节">
          <Tree
            checkable
            defaultExpandAll
            treeData={VIP_CHAPTER_TREE}
            style={{ maxHeight: 300, overflowY: 'auto' }}
          />
        </Form.Item>
      </Card>
    </FormPageTemplate>
  );
}
