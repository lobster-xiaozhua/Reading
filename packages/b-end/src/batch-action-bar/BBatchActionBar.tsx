/* ============================================================
 * P2-4 · BatchActionBar 批量操作栏
 * selectedCount + actions[] + visible + onClear
 * 底部固定浮出 --dur-normal 240ms + --sh-4；危险操作 type='danger' + confirm
 * Source: 04 §6.5
 * ============================================================ */

import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { Button, Space, Modal } from 'antd';
import type { ButtonProps } from 'antd';

export interface BatchAction {
  /** 操作 key */
  key: string;
  /** 按钮文案 */
  label: string;
  /** 按钮类型 */
  type?: ButtonProps['type'];
  /** 是否危险操作（需二次确认） */
  danger?: boolean;
  /** 二次确认标题（danger=true 时必填） */
  confirmTitle?: string;
  /** 二次确认内容 */
  confirmContent?: ReactNode;
  /** 点击回调 */
  onClick: () => void;
  /** 是否禁用 */
  disabled?: boolean;
}

export interface BBatchActionBarProps {
  /** 已选数量 */
  selectedCount: number;
  /** 操作列表 */
  actions: BatchAction[];
  /** 是否显示 */
  visible: boolean;
  /** 清除选择回调 */
  onClear: () => void;
}

/**
 * B 端批量操作栏
 * - 选中行 > 0 时底部固定浮出
 * - 浮出动画 --dur-normal 240ms
 * - 阴影 --sh-4
 * - 危险操作二次确认
 */
export const BBatchActionBar = forwardRef<HTMLDivElement, BBatchActionBarProps>(
  function BBatchActionBar({ selectedCount, actions, visible, onClear }, ref) {
    if (!visible || selectedCount === 0) return null;

    const handleAction = (action: BatchAction) => {
      if (action.danger && action.confirmTitle) {
        Modal.confirm({
          title: action.confirmTitle,
          content: action.confirmContent,
          okType: 'danger',
          okText: '确认',
          cancelText: '取消',
          onOk: action.onClick,
        });
      } else {
        action.onClick();
      }
    };

    return (
      <div
        ref={ref}
        className="b-batch-action-bar"
        style={{
          position: 'fixed',
          bottom: 'var(--space-5)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-md, 8px)',
          boxShadow: 'var(--sh-4)',
          padding: 'var(--space-3) var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          animation: 'b-batch-slide-in var(--dur-normal, 240ms) var(--ease-out, ease-out)',
        }}
        role="toolbar"
        aria-label={`批量操作栏，已选 ${selectedCount} 项`}
      >
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
          已选 <span style={{ color: 'var(--color-brand)' }}>{selectedCount}</span> 项
        </span>
        <Space size="small">
          {actions.map((action) => (
            <Button
              key={action.key}
              type={action.type ?? 'default'}
              danger={action.danger}
              disabled={action.disabled}
              onClick={() => handleAction(action)}
            >
              {action.label}
            </Button>
          ))}
        </Space>
        <Button type="text" size="small" onClick={onClear} aria-label="清除选择">
          清除
        </Button>
        <style>{`
          @keyframes b-batch-slide-in {
            from { transform: translateX(-50%) translateY(100%); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  },
);
