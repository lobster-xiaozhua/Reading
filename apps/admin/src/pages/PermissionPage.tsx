/* ============================================================
 * P6-7 · 角色权限分配页
 * 左侧角色列表 + 右侧权限分配树（Tree + 复选）
 * 超级管理员权限只读；其他角色可分配权限点
 * Source: 04 §10.7 / P6-7
 * ============================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react';
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

  // 加载选中角色详情
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

  // 权限树数据
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
      // 过滤掉 module: 前缀的分组节点
      const perms = checkedKeys.filter((k): k is Permission => typeof k === 'string' && !k.startsWith('module:')) as Permission[];
      const res = await updateRolePermissions(currentRole.key, perms);
      if (res.success) {
        message.success(`「${currentRole.name}」权限已更新`);
        setCurrentRole({ ...currentRole, permissions: perms });
        loadData();
      } else {
        message.error(res.reason ?? '权限更新失败');
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
      message.success('角色信息已更新');
      setCurrentRole({ ...currentRole, name: metaDraft.name, description: metaDraft.description });
      setEditingMeta(false);
      loadData();
    } else {
      message.error('更新失败');
    }
  };

  const breadcrumb: BPageHeaderProps['breadcrumb'] = [
    { title: '用户管理' },
    { title: '角色权限' },
  ];

  // 选中角色的权限数统计
  const selectedCount = checkedKeys.filter((k) => typeof k === 'string' && !k.startsWith('module:')).length;
  const isReadonly = currentRole?.key === 'super-admin';

  return (
    <div className="b-permission-page">
      <BPageHeader
        title="角色权限分配"
        breadcrumb={breadcrumb}
        onBack={() => navigate('/workbench')}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
          </Space>
        }
      />

      {status === 'error' ? (
        <Result status="error" title="加载失败" subTitle="角色列表加载出错，请重试。" extra={<Button type="primary" onClick={loadData}>重试</Button>} />
      ) : (
        <div style={{ display: 'flex', gap: 'var(--space-4)', minHeight: 600 }}>
          {/* 左侧：角色列表 30% */}
          <Card
            title="角色列表"
            style={{ width: '30%' }}
            styles={{ body: { padding: 0 } }}
          >
            {status === 'loading' ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : roles.length === 0 ? (
              <Empty description="暂无角色" style={{ padding: 'var(--space-8)' }} />
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
                                {role.key === 'super-admin' ? <><LockOutlined /> 内置</> : '内置'}
                              </Tag>
                            )}
                          </Space>
                          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-caption, 13px)' }}>
                            {role.userCount} 人
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
                            {role.permissions.length} 个权限点
                          </span>
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>

          {/* 右侧：角色详情 + 权限分配树 70% */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {status === 'loading' ? (
              <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>
            ) : !currentRole ? (
              <Card>
                <Empty description="请从左侧选择角色" style={{ padding: 'var(--space-8)' }} />
              </Card>
            ) : (
              <>
                {/* 角色基本信息 */}
                <Card
                  title="角色信息"
                  extra={
                    <Authorized permission="permission.assign" fallback={null}>
                      {!isReadonly && canEditAnyRole && (
                        editingMeta ? (
                          <Space>
                            <Button size="small" onClick={() => { setEditingMeta(false); setMetaDraft({ name: currentRole.name, description: currentRole.description }); }}>取消</Button>
                            <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSaveMeta}>保存</Button>
                          </Space>
                        ) : (
                          <Button size="small" onClick={() => setEditingMeta(true)}>编辑信息</Button>
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
                        placeholder="角色名称"
                        maxLength={20}
                        addonBefore="名称"
                      />
                      <Input.TextArea
                        value={metaDraft.description}
                        onChange={(e) => setMetaDraft((d) => ({ ...d, description: e.target.value }))}
                        placeholder="角色描述"
                        rows={2}
                        maxLength={100}
                        showCount
                      />
                    </Space>
                  ) : (
                    <Descriptions column={2} size="small">
                      <Descriptions.Item label="角色标识">
                        <Tag>{currentRole.key}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="角色名称">{currentRole.name}</Descriptions.Item>
                      <Descriptions.Item label="数据范围">
                        <Tag color={currentRole.dataScope === 'all' ? 'success' : currentRole.dataScope === 'department' ? 'processing' : 'default'}>
                          {DATA_SCOPE_LABEL_HELPER[currentRole.dataScope]}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="用户数">{currentRole.userCount} 人</Descriptions.Item>
                      <Descriptions.Item label="描述" span={2}>{currentRole.description}</Descriptions.Item>
                    </Descriptions>
                  )}
                </Card>

                {/* 权限分配树 */}
                <Card
                  title={
                    <Space>
                      <span>权限分配</span>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-caption, 13px)', fontWeight: 'normal' }}>
                        已选 {selectedCount} / 共 {PERMISSION_TREE.reduce((sum, g) => sum + g.permissions.length, 0)} 项
                      </span>
                      {isReadonly && <Tag color="warning"><LockOutlined /> 只读</Tag>}
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
                          保存权限
                        </Button>
                      )}
                    </Authorized>
                  }
                >
                  {isReadonly ? (
                    <div style={{ padding: 'var(--space-3)', background: 'var(--color-feedback-warning-bg)', borderRadius: 'var(--radius-md, 8px)', marginBottom: 'var(--space-3)', color: 'var(--color-feedback-warning)' }}>
                      超级管理员拥有全部权限，且不可修改。
                    </div>
                  ) : (
                    <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md, 8px)', marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                      勾选权限点后点击「保存权限」生效。修改将记录到操作日志。
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
