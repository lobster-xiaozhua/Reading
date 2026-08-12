import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  Checkbox,
  Radio,
  InputNumber,
  Tree,
  Upload,
  Card,
  App,
} from "antd";
import type { UploadFile, TreeDataNode } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { FormPageTemplate } from "@/templates/FormPageTemplate";
import type { FormPageStatus } from "@/templates/FormPageTemplate";
import {
  fetchNovelDetail,
  submitNovel,
  uploadCoverImage,
  NOVEL_CATEGORIES,
} from "@/api/novel-api";
import type { NovelFormValues } from "@/api/novel-api";
import { http } from "@/api/http";
import "./NovelFormPage.css";

const { TextArea } = Input;

/** 客户端图片压缩：缩放至最大尺寸 600px，JPEG quality 0.8，保持宽高比 */
function compressImage(file: File, maxDim = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas 不可用")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("图片加载失败"));
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target?.result as string; };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const CATEGORY_OPTIONS = NOVEL_CATEGORIES.filter((c) => c.value !== "all").map(
  (c) => ({
    value: c.value,
    label: c.label,
  }),
);

const TAG_SUGGESTIONS = [
  "穿越",
  "重生",
  "系统",
  "修仙",
  "玄幻",
  "言情",
  "都市",
  "历史",
  "科幻",
  "悬疑",
  "盗墓",
  "游戏",
  "竞技",
  "轻小说",
  "同人",
  "种田",
  "争霸",
  "后宫",
  "无敌",
  "脑洞",
  "变身",
  "综漫",
  "腹黑",
  "扮猪吃虎",
];

export default function NovelFormPage() {
  const { t } = useTranslation();
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [status, setStatus] = useState<FormPageStatus>("editing");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [chapterTree, setChapterTree] = useState<TreeDataNode[]>([]);
  const isEdit = Boolean(novelId);

  const loadChapters = useCallback(
    async (id: string) => {
      try {
        const data = await http.get<{ index: number; title: string }[]>(
          `/novels/${id}/chapters`,
        );
        if (data && data.length > 0) {
          setChapterTree([
            {
              title: t("novelForm:treeAll"),
              key: "all",
              children: data.map((ch: { index: number; title: string }) => ({
                title: t("novelForm:treeChapter", {
                  index: ch.index,
                  title: ch.title,
                }),
                key: `ch-${ch.index}`,
              })),
            },
          ]);
        }
      } catch {
        // 章节树加载失败不影响表单编辑
      }
    },
    [t],
  );

  useEffect(() => {
    if (!isEdit) {
      setStatus("editing");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [data] = await Promise.all([
          fetchNovelDetail(novelId!),
          loadChapters(novelId!),
        ]);
        if (cancelled || !data) {
          setStatus("editing");
          return;
        }
        form.setFieldsValue({
          id: data.id,
          title: data.title,
          author: data.author,
          category: data.category,
          tags: data.tags,
          intro: data.intro,
          isCompleted: data.isCompleted,
          price: 0,
          vipChapters: [],
          cover: data.cover || undefined,
        });
        if (data.cover) {
          setFileList([
            { uid: "-cover", name: "封面", status: "done", url: data.cover },
          ]);
        }
        setStatus("editing");
      } catch {
        setStatus("editing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [novelId, form, isEdit, loadChapters]);

  const handleFinish = async (values: Record<string, unknown>) => {
    setStatus("submitting");
    try {
      const formValues = values as unknown as NovelFormValues;
      formValues.id = novelId;
      await submitNovel(formValues);
      setStatus("success");
    } catch {
      message.error(t("novelForm:message.submitFailed"));
      setStatus("editing");
    }
  };

  const [savingDraft, setSavingDraft] = useState(false);

  const handleDraft = async () => {
    if (savingDraft) return;
    const values = form.getFieldsValue();
    const draftValues: NovelFormValues = {
      ...values,
      id: novelId,
    };
    setSavingDraft(true);
    try {
      await submitNovel(draftValues);
      message.success(t("novelForm:message.saved"));
    } catch {
      message.error(t("novelForm:message.submitFailed"));
    } finally {
      setSavingDraft(false);
    }
  };

  const beforeUpload = async (file: File) => {
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      message.error(t("novelForm:message.imageOnly"));
      return Upload.LIST_IGNORE;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error(t("novelForm:message.imageTooLarge"));
      return Upload.LIST_IGNORE;
    }
    try {
      // 客户端压缩后再上传真实文件，避免大图 base64 超大 payload
      const dataUrl = await compressImage(file);
      const blob = await (await fetch(dataUrl)).blob();
      const coverFile = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
        type: "image/jpeg",
      });
      const url = await uploadCoverImage(coverFile);
      form.setFieldValue("cover", url);
      setFileList([
        { uid: "-cover", name: file.name, status: "done", url },
      ]);
      return Upload.LIST_IGNORE;
    } catch {
      message.error(t("novelForm:message.uploadFailed"));
      return Upload.LIST_IGNORE;
    }
  };

  return (
    <FormPageTemplate
      title={isEdit ? t("novelForm:editTitle") : t("novelForm:createTitle")}
      breadcrumb={[
        { title: t("novelForm:breadcrumb.content") },
        {
          title: t("novelForm:breadcrumb.novel"),
          onClick: () => navigate("/novel"),
        },
        {
          title: isEdit
            ? t("novelForm:breadcrumb.edit")
            : t("novelForm:breadcrumb.create"),
        },
      ]}
      onBack={() => navigate("/novel")}
      status={status}
      form={form}
      onFinish={handleFinish}
      onCancel={() => navigate("/novel")}
      onSuccessContinue={() => {
        form.resetFields();
        setStatus("editing");
      }}
      submitText={isEdit ? t("novelForm:save") : t("novelForm:submit")}
      showDraft
      onDraft={handleDraft}
    >
      <Card
        title={t("novelForm:card.basic")}
        style={{ marginBottom: "var(--space-4)" }}
      >
        <Form.Item
          name="title"
          label={t("novelForm:field.title")}
          rules={[
            { required: true, message: t("novelForm:field.titleRequired") },
            { max: 50, message: t("novelForm:field.titleMax") },
          ]}
        >
          <Input
            placeholder={t("novelForm:field.titlePlaceholder")}
            maxLength={50}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="author"
          label={t("novelForm:field.author")}
          rules={[
            { required: true, message: t("novelForm:field.authorRequired") },
          ]}
        >
          <Input placeholder={t("novelForm:field.authorPlaceholder")} />
        </Form.Item>

        <Form.Item
          name="category"
          label={t("novelForm:field.category")}
          rules={[
            { required: true, message: t("novelForm:field.categoryRequired") },
          ]}
        >
          <Radio.Group className="filter-checkbox-group">
            {CATEGORY_OPTIONS.map((c) => (
              <Radio key={c.value} value={c.value}>
                {c.label}
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>

        <Form.Item name="tags" label={t("novelForm:field.tags")}>
          <Checkbox.Group
            className="filter-checkbox-group is-wide"
            options={TAG_SUGGESTIONS.map((tag) => ({
              label: tag,
              value: tag,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="intro"
          label={t("novelForm:field.intro")}
          rules={[
            { required: true, message: t("novelForm:field.introRequired") },
            { max: 500, message: t("novelForm:field.introMax") },
          ]}
        >
          <TextArea
            placeholder={t("novelForm:field.introPlaceholder")}
            rows={4}
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Card>

      <Card
        title={t("novelForm:card.cover")}
        style={{ marginBottom: "var(--space-4)" }}
      >
        <Form.Item name="cover" label={t("novelForm:field.coverImage")}>
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
                <div style={{ marginTop: 8 }}>
                  {t("novelForm:field.uploadCover")}
                </div>
                <div
                  style={{
                    fontSize: "var(--font-size-caption, 13px)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {t("novelForm:field.uploadHint")}
                </div>
              </div>
            )}
          </Upload>
        </Form.Item>
      </Card>

      <Card
        title={t("novelForm:card.settings")}
        style={{ marginBottom: "var(--space-4)" }}
      >
        <Form.Item
          name="isCompleted"
          label={t("novelForm:field.serialStatus")}
          initialValue={false}
        >
          <Radio.Group>
            <Radio value={false}>{t("novelForm:field.ongoing")}</Radio>
            <Radio value={true}>{t("novelForm:field.completed")}</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="price"
          label={t("novelForm:field.pricing")}
          initialValue={0}
        >
          <InputNumber min={0} max={9999} step={1} style={{ width: 200 }} />
        </Form.Item>

        <Form.Item
          name="vipChapters"
          label={t("novelForm:field.vipChapter")}
          getValueFromEvent={(checkedKeys) => checkedKeys as string[]}
        >
          <Tree
            checkable
            defaultExpandAll
            treeData={
              chapterTree.length > 0
                ? chapterTree
                : [
                    {
                      title: t("novelForm:field.noChapters"),
                      key: "empty",
                      disableCheckbox: true,
                      selectable: false,
                    },
                  ]
            }
            style={{ maxHeight: 300, overflowY: "auto" }}
            onCheck={(checked) =>
              form.setFieldValue("vipChapters", checked as string[])
            }
          />
        </Form.Item>
      </Card>
    </FormPageTemplate>
  );
}
