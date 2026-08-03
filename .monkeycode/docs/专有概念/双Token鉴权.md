# 双 Token 鉴权

后端采用 JWT + Redis 双 Token 鉴权机制，开发环境自动降级为 demo 用户。API 端点列表见 [INTERFACES.md](../INTERFACES.md)。

## 鉴权流程

```
客户端登录 → 服务端验证凭据 → 生成双 Token → 返回给客户端
    ↓
客户端后续请求携带 Access Token → 服务端验证 → 返回数据
    ↓
Access Token 过期 → 客户端用 Refresh Token 换取新的双 Token
```

## Token 类型

| Token | 有效期 | 存储位置 | 用途 |
|-------|--------|----------|------|
| Access Token | 8 小时 | 客户端内存/ localStorage | 接口鉴权 |
| Refresh Token | 30 天（普通）/ 90 天（记住登录） | 客户端 | 刷新 Access Token |

## JWT Payload

```json
{
  "sub": "1",
  "type": "access",
  "username": "admin",
  "nickname": "管理员",
  "roles": ["super-admin"],
  "permissions": ["novel.list", "novel.create", "..."],
  "exp": 1712345678,
  "iat": 1712315678
}
```

## 安全措施

| 措施 | 说明 |
|------|------|
| 密码哈希 | bcrypt，cost factor = 12，72 字节截断处理 |
| 会话管理 | Redis 维护活跃会话，登出即失效 |
| Refresh Token 轮换 | 每次刷新生成新 Refresh Token，旧 Token 失效 |
| 登录失败次数限制 | 超过阈值暂时锁定 |
| 限流 | SlowAPI 按端点配置（登录 5 次/分钟，搜索 10 次/分钟） |

## 开发者降级策略

开发模式下，不传 Token 时自动降级：

### B 端

```python
# 无 Token 时降级为 demo 超级管理员
current_admin = AdminContext(
    id=0,
    username="admin",
    nickname="演示管理员",
    roles=["super-admin"],
    permissions=ALL_PERMISSIONS,
)
```

- 用户名: `admin`
- 密码: `admin123`

### C 端

```python
# 无 Token 时降级为 demo 读者
current_reader_id = 1001
```

权限校验依赖 `require_permission` 基于 [权限体系](./权限体系.md) 中的 20 项权限点。

## 依赖注入

```python
# B 端：获取当前管理员
from app.api.deps import get_current_admin, require_permission

@router.get("/novels")
async def list_novels(
    current_admin: AdminContext = Depends(get_current_admin),
    # 需要特定权限
    _ = Depends(require_permission("novel.list")),
):
    ...

# C 端：获取当前读者 ID
from app.api.deps import get_current_reader

@router.get("/me/bookshelf")
async def get_bookshelf(
    reader_id: int = Depends(get_current_reader),
):
    ...
```

## 前端实现

```typescript
// 从 localStorage 读取 token
const token = JSON.parse(
  localStorage.getItem('atlas-admin-auth') || '{}'
).state?.token;

// 注入 Authorization 头
const headers: Record<string, string> = {};
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}
```