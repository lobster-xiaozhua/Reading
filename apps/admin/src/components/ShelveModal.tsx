import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Radio, Input, Space, Tag } from "antd";
import { OFFLINE_REASON_OPTIONS } from "@/api/novel-api";

interface ShelveModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => Promise<void>;
  title?: string;
}

export function ShelveModal({
  open,
  onClose,
  onConfirm,
  title,
}: ShelveModalProps) {
  const { t } = useTranslation();
  const [shelveReason, setShelveReason] = useState("operation-adjust");
  const [shelveNote, setShelveNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(shelveReason, shelveNote);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={title ?? t("novel:offline.title", { count: 1 })}
      open={open}
      onOk={handleConfirm}
      onCancel={onClose}
      confirmLoading={loading}
      okText={t("novel:offline.confirm")}
      cancelText={t("novel:offline.cancel")}
    >
      <div style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ marginBottom: "var(--space-2)", fontWeight: 500 }}>
          {t("novel:offline.reasonRequired")}
        </div>
        <Radio.Group
          value={shelveReason}
          onChange={(e) => setShelveReason(e.target.value)}
        >
          <Space direction="vertical">
            {OFFLINE_REASON_OPTIONS.map((opt) => (
              <Radio key={opt.value} value={opt.value}>
                <Tag color={opt.color}>{opt.label}</Tag>
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </div>
      <div>
        <div style={{ marginBottom: "var(--space-2)", fontWeight: 500 }}>
          {t("novel:offline.remark")}
        </div>
        <Input.TextArea
          value={shelveNote}
          onChange={(e) => setShelveNote(e.target.value)}
          rows={3}
          placeholder={t("novel:offline.remarkPlaceholder")}
        />
      </div>
    </Modal>
  );
}
