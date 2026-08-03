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
        <span style={{ fontWeight: 600 }}>
          {group.label}
          <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 'normal', marginLeft: 'var(--space-2)' }}>
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
            <Tag style={{ fontSize: 'var(--font-size-caption, 12px)' }}>{p.key}</Tag>
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
        <div style={{ display: 'flex', gap: 'var(--space-4)', minHeight: 600 }}>
          <Card
            title={t('permission:roleList')}
            style={{ width: '30%' }}
            styles={{ body: { padding: 0 } }}
          >
            {status === 'loading' ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : roles.length === 0 ? (
              <Empty description={t('permission:empty')} style={{ padding: 'var(--space-8)' }} />
            ) : (
              <List
                dataSource={roles}
                split
                renderItem={(role) => {
                  const isSelected = role.key === selectedRoleKey;
                  return (
                    <List.Item
                      onClick={() => setSelectedRoleKey(role.key)}
                      style={{
                        cursor: 'pointer',
                        padding: 'var(--space-3) var(--space-4)',
                        background: isSelected ? 'var(--color-brand-bg)' : undefined,
                        borderLeft: isSelected ? `3px solid var(--color-brand)` : '3px solid transparent',
                        transition: 'background var(--dur-fast) var(--ease-out)',
                      }}
                    >
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                          <Space>
                            <strong>{role.name}</strong>
                            {role.builtin && (
                              <Tag color="default" style={{ fontSize: 'var(--font-size-caption, 12px)' }}>
                                {role.key === 'super-admin' ? <><LockOutlined /> {t('permission:builtin')}</> : t('permission:builtin')}
                              </Tag>
                            )}
                          </Space>
                          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-caption, 13px)' }}>
                            {t('permission:userCount', { count: role.userCount })}
                          </span>
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-caption, 13px)' }}>
                          {role.description}
                        </div>
                        <div style={{ marginTop: 'var(--space-1)' }}>
                          <Tag color={role.dataScope === 'all' ? 'success' : role.dataScope === 'department' ? 'processing' : 'default'}>
                            {DATA_SCOPE_LABEL_HELPER[role.dataScope]}
                          </Tag>
                          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-caption, 13px)' }}>
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

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {status === 'loading' ? (
              <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>
            ) : !currentRole ? (
              <Card>
                <Empty description={t('permission:emptySelect')} style={{ padding: 'var(--space-8)' }} />
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
                    <Space direction="vertical" style={{ width: '100%' }}>
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
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-caption, 13px)', fontWeight: 'normal' }}>
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
                    <div style={{ padding: 'var(--space-3)', background: 'var(--color-feedback-warning-bg)', borderRadius: 'var(--radius-md, 8px)', marginBottom: 'var(--space-3)', color: 'var(--color-feedback-warning)' }}>
                      {t('permission:superAdminHint')}
                    </div>
                  ) : (
                    <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md, 8px)', marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
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