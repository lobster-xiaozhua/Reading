import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  List,
  Tag,
  Tree,
  Button,
  Space,
  Empty,
  Result,
  Skeleton,
  App,
  Descriptions,
  Input,
} from 'antd';
import type { TreeDataNode } from 'antd';
import { LockOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import type { AdminRole, Permission } from '@/api/types';
import { BPageHeader } from '@novel/b-end';
import type { BPageHeaderProps } from '@novel/b-end';
import { Authorized } from '@/components/Authorized';
import { usePermission } from '@/hooks/usePermission';
import {
  fetchRoleList,
  fetchRoleDetail,
  updateRolePermissions,
  updateRoleMeta,
} from '@/api/role-api';
import type { RoleMeta } from '@/api/role-api';
import {
  PERMISSION_TREE,
  DATA_SCOPE_LABEL_HELPER,
} from '@/constants/role-display';
import './PermissionPage.css';

type PageStatus = 'loading' | 'ready' | 'empty' | 'error';

export default function PermissionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { isSuperAdmin: canEditAnyRole } = usePermission();

  const [status, setStatus] = useState<PageStatus>('loading');
  const [roles, setRoles] = useState<RoleMeta[]>([]);
  const [selectedRoleKey, setSelectedRoleKey] = useState<AdminRole | null>(null);
  const [currentRole, setCurrentRole] = useState<RoleMeta | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaDraft, setMetaDraft] = useState<{ name: string; description: string }>({ name: '', description: '' });

  const loadData = useCallback(async () => {
    setStatus('loading');
    try {
      const list = await fetchRoleList();
      setRoles(list);
      if (list.length > 0 && !list.find((r) => r.key === selectedRoleKey)) {
        setSelectedRoleKey(list[0].key);
      } else if (list.length === 0) {
        setSelectedRoleKey(null);
      }
      setStatus(list.length === 0 ? 'empty' : 'ready');
    } catch {
      setStatus('error');
    }
  }, [selectedRoleKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedRoleKey) {
      setCurrentRole(null);
      setCheckedKeys([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const detail = await fetchRoleDetail(selectedRoleKey);
      if (cancelled || !detail) return;
      setCurrentRole(detail);
      setCheckedKeys(detail.permissions);
      setMetaDraft({ name: detail.name, description: detail.description });
      setEditingMeta(false);
    })();
    return () => { cancelled = true; };
  }, [selectedRoleKey]);

  const treeData = useMemo<TreeDataNode[]>(() => {
    return PERMISSION_TREE.map((group) => ({
      key: `module:${group.module}`,
      title: (
        <span className="pp-tree-node__title">
          {group.label}
          <span className="pp-tree-node__count">
            ({group.permissions.length})
          </span>
        </span>
      ),
      selectable: false,
      children: group.permissions.map((p) => ({
        key: p.key,
        title: (
          <Space>
            <span>{p.label}</span>
            <Tag className="pp-tree-node__tag">{p.key}</Tag>
          </Space>
        ),
        selectable: false,
      })),
    }));
  }, []);

  const handleSavePermissions = async () => {
    if (!currentRole) return;
    setSaving(true);
    try {
      const perms = checkedKeys.filter((k): k is Permission => typeof k === 'string' && !k.startsWith('module:')) as Permission[];
      const res = await updateRolePermissions(currentRole.key, perms);
      if (res.success) {
        message.success(t('permission:message.updated', { role: currentRole.name }));
        setCurrentRole({ ...currentRole, permissions: perms });
        loadData();
      } else {
        message.error(res.reason ?? t('permission:message.updateFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMeta = async () => {
    if (!currentRole) return;
    const res = await updateRoleMeta(currentRole.key, {
      name: metaDraft.name.trim(),
      description: metaDraft.description.trim(),
    });
    if (res.success) {
      message.success(t('permission:message.infoUpdated'));
      setCurrentRole({ ...currentRole, name: metaDraft.name, description: metaDraft.description });
      setEditingMeta(false);
      loadData();
    } else {
      message.error(t('permission:message.infoUpdateFailed'));
    }
  };

  const breadcrumb: BPageHeaderProps['breadcrumb'] = [
    { title: t('permission:breadcrumb.user') },
    { title: t('permission:breadcrumb.permission') },
  ];

  const selectedCount = checkedKeys.filter((k) => typeof k === 'string' && !k.startsWith('module:')).length;
  const isReadonly = currentRole?.key === 'super-admin';

  return (
    <div className="b-permission-page">
      <BPageHeader
        title={t('permission:title')}
        breadcrumb={breadcrumb}
        onBack={() => navigate('/workbench')}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>{t('common:refresh')}</Button>
          </Space>
        }
      />

      {status === 'error' ? (
        <Result status="error" title={t('common:loading')} subTitle={t('common:empty')} extra={<Button type="primary" onClick={loadData}>{t('common:retry')}</Button>} />
      ) : (
        <div className="pp-layout">
          <Card
            title={t('permission:roleList')}
            className="pp-sidebar"
            styles={{ body: { padding: 0 } }}
          >
            {status === 'loading' ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : roles.length === 0 ? (
              <Empty description={t('permission:empty')} className="pp-empty" />
            ) : (
              <List
                dataSource={roles}
                split
                renderItem={(role) => {
                  const isSelected = role.key === selectedRoleKey;
                  return (
                    <List.Item
                      onClick={() => setSelectedRoleKey(role.key)}
                      className={`pp-item${isSelected ? ' pp-item--selected' : ''}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedRoleKey(role.key); }}
                    >
                      <div className="pp-item__inner">
                        <div className="pp-item__header">
                          <Space>
                            <strong>{role.name}</strong>
                            {role.builtin && (
                              <Tag color="default" className="pp-tree-node__tag">
                                {role.key === 'super-admin' ? <><LockOutlined /> {t('permission:builtin')}</> : t('permission:builtin')}
                              </Tag>
                            )}
                          </Space>
                          <span className="pp-item__meta">
                            {t('permission:userCount', { count: role.userCount })}
                          </span>
                        </div>
                        <div className="pp-item__description">
                          {role.description}
                        </div>
                        <div className="pp-item__footer">
                          <Tag color={role.dataScope === 'all' ? 'success' : role.dataScope === 'department' ? 'processing' : 'default'}>
                            {DATA_SCOPE_LABEL_HELPER[role.dataScope]}
                          </Tag>
                          <span className="pp-item__permission-count">
                            {t('permission:permissionCount', { count: role.permissions.length })}
                          </span>
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>

          <div className="pp-content-area">
            {status === 'loading' ? (
              <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>
            ) : !currentRole ? (
              <Card>
                <Empty description={t('permission:emptySelect')} className="pp-empty" />
              </Card>
            ) : (
              <>
                <Card
                  title={t('permission:roleInfo')}
                  extra={
                    <Authorized permission="permission.assign" fallback={null}>
                      {!isReadonly && canEditAnyRole && (
                        editingMeta ? (
                          <Space>
                            <Button size="small" onClick={() => { setEditingMeta(false); setMetaDraft({ name: currentRole.name, description: currentRole.description }); }}>{t('permission:cancel')}</Button>
                            <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSaveMeta}>{t('permission:save')}</Button>
                          </Space>
                        ) : (
                          <Button size="small" onClick={() => setEditingMeta(true)}>{t('permission:editInfo')}</Button>
                        )
                      )}
                    </Authorized>
                  }
                >
                  {editingMeta ? (
                    <Space direction="vertical" className="pp-info-panel">
                      <Input
                        value={metaDraft.name}
                        onChange={(e) => setMetaDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder={t('permission:placeholder.name')}
                        maxLength={20}
                        addonBefore={t('permission:field.name')}
                      />
                      <Input.TextArea
                        value={metaDraft.description}
                        onChange={(e) => setMetaDraft((d) => ({ ...d, description: e.target.value }))}
                        placeholder={t('permission:placeholder.description')}
                        rows={2}
                        maxLength={100}
                        showCount
                      />
                    </Space>
                  ) : (
                    <Descriptions column={2} size="small">
                      <Descriptions.Item label={t('permission:field.key')}>
                        <Tag>{currentRole.key}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label={t('permission:field.roleName')}>{currentRole.name}</Descriptions.Item>
                      <Descriptions.Item label={t('permission:field.dataScope')}>
                        <Tag color={currentRole.dataScope === 'all' ? 'success' : currentRole.dataScope === 'department' ? 'processing' : 'default'}>
                          {DATA_SCOPE_LABEL_HELPER[currentRole.dataScope]}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label={t('permission:field.userCount')}>{t('permission:userCount', { count: currentRole.userCount })}</Descriptions.Item>
                      <Descriptions.Item label={t('permission:field.description')} span={2}>{currentRole.description}</Descriptions.Item>
                    </Descriptions>
                  )}
                </Card>

                <Card
                  title={
                    <Space>
                      <span>{t('permission:permissionAssign')}</span>
                      <span className="pp-subtitle">
                        {t('permission:selectedCount', { selected: selectedCount, total: PERMISSION_TREE.reduce((sum, g) => sum + g.permissions.length, 0) })}
                      </span>
                      {isReadonly && <Tag color="warning"><LockOutlined /> {t('permission:readonly')}</Tag>}
                    </Space>
                  }
                  extra={
                    <Authorized permission="permission.assign" fallback={null}>
                      {!isReadonly && (
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          loading={saving}
                          onClick={handleSavePermissions}
                        >
                          {t('permission:savePermission')}
                        </Button>
                      )}
                    </Authorized>
                  }
                >
                  {isReadonly ? (
                    <div className="pp-hint-warning">
                      {t('permission:superAdminHint')}
                    </div>
                  ) : (
                    <div className="pp-hint-info">
                      {t('permission:saveHint')}
                    </div>
                  )}
                  <Tree
                    checkable
                    defaultExpandAll
                    checkedKeys={checkedKeys}
                    onCheck={(keys) => {
                      if (isReadonly) return;
                      setCheckedKeys(keys as React.Key[]);
                    }}
                    treeData={treeData}
                    disabled={isReadonly}
                    selectable={false}
                  />
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}