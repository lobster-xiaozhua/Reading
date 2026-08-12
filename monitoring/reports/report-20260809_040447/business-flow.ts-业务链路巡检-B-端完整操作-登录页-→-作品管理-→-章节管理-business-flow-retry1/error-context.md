# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: business-flow.ts >> 业务链路巡检 >> B 端完整操作: 登录页 → 作品管理 → 章节管理
- Location: monitoring/checks/business-flow.ts:60:7

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=f2e4]:
  - generic [ref=f2e5]:
    - heading "Atlas 小说管理平台" [level=1] [ref=f2e10]
    - paragraph [ref=f2e11]: 一体化作品管理、内容审核与数据运营中枢
    - list [ref=f2e12]:
      - listitem [ref=f2e13]:
        - generic [ref=f2e17]: 多维度经营数据看板
      - listitem [ref=f2e18]:
        - generic [ref=f2e22]: 全流程内容审核工作台
      - listitem [ref=f2e23]:
        - generic [ref=f2e27]: 细粒度角色与权限体系
  - generic [ref=f2e30]:
    - generic [ref=f2e31]:
      - heading "Atlas 运营后台" [level=3] [ref=f2e32]
      - text: 小说运营管理系统
    - generic [ref=f2e33]:
      - generic [ref=f2e35]:
        - generic "用户名" [ref=f2e37]
        - generic [ref=f2e41]:
          - img "user" [ref=f2e43]
          - textbox "用户名" [ref=f2e46]:
            - /placeholder: 请输入用户名
      - generic [ref=f2e48]:
        - generic "密码" [ref=f2e50]
        - generic [ref=f2e54]:
          - img "lock" [ref=f2e56]
          - textbox "密码" [ref=f2e59]:
            - /placeholder: 请输入密码
          - img "eye-invisible" [ref=f2e61] [cursor=pointer]
      - generic [ref=f2e70] [cursor=pointer]:
        - checkbox "记住我（7 天免登录）" [checked] [ref=f2e72]
        - generic [ref=f2e74]: 记住我（7 天免登录）
      - button "登 录" [ref=f2e80] [cursor=pointer]
    - generic [ref=f2e82]:
      - generic [ref=f2e83]: 演示账号（P6 多角色）：
      - generic [ref=f2e84]:
        - generic [ref=f2e85]:
          - generic [ref=f2e86]: "管理员: admin / admin123"
          - generic [ref=f2e87] [cursor=pointer]: 一键填充
        - generic [ref=f2e88]:
          - generic [ref=f2e89]: "内容管理员: content / content123"
          - generic [ref=f2e90] [cursor=pointer]: 一键填充
        - generic [ref=f2e91]:
          - generic [ref=f2e92]: "审核员: auditor / auditor123"
          - generic [ref=f2e93] [cursor=pointer]: 一键填充
        - generic [ref=f2e94]:
          - generic [ref=f2e95]: "运营: operation / operation123"
          - generic [ref=f2e96] [cursor=pointer]: 一键填充
```