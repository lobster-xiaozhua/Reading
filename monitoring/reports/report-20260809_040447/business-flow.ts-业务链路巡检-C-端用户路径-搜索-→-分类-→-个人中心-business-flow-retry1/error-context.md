# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: business-flow.ts >> 业务链路巡检 >> C 端用户路径: 搜索 → 分类 → 个人中心
- Location: monitoring/checks/business-flow.ts:82:7

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=f2e3]:
  - link "跳到主内容" [ref=f2e4] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f2e5]:
    - generic [ref=f2e6]:
      - link "Atlas 小说阅读 首页" [ref=f2e7] [cursor=pointer]:
        - /url: /
        - generic [ref=f2e8]: A
        - generic [ref=f2e9]: Atlas
      - navigation "主导航" [ref=f2e10]:
        - link "首页" [ref=f2e11] [cursor=pointer]:
          - /url: /
        - link "分类" [ref=f2e15] [cursor=pointer]:
          - /url: /category
        - link "搜索" [ref=f2e16] [cursor=pointer]:
          - /url: /search
      - search [ref=f2e17]:
        - searchbox "搜索" [ref=f2e18]
        - button "搜索" [ref=f2e19] [cursor=pointer]
      - button "登录" [ref=f2e21] [cursor=pointer]
  - main [ref=f2e22]
  - contentinfo [ref=f2e23]:
    - generic [ref=f2e24]:
      - generic [ref=f2e25]:
        - generic [ref=f2e26]: Atlas 阅读
        - paragraph [ref=f2e31]: 沉浸阅读，发现好书
        - list [ref=f2e32]:
          - listitem [ref=f2e33]:
            - generic [ref=f2e36]: 多主题沉浸式阅读
          - listitem [ref=f2e37]:
            - generic [ref=f2e41]: 智能推荐，懂你所想
          - listitem [ref=f2e42]:
            - generic [ref=f2e45]: 书架同步，随时续读
      - generic [ref=f2e46]:
        - navigation "页面导航" [ref=f2e47]:
          - generic [ref=f2e48]: 导航
          - link "首页" [ref=f2e49] [cursor=pointer]:
            - /url: /
          - link "分类" [ref=f2e50] [cursor=pointer]:
            - /url: /category
          - link "搜索" [ref=f2e51] [cursor=pointer]:
            - /url: /search
          - link "个人中心" [ref=f2e52] [cursor=pointer]:
            - /url: /profile
        - navigation "法律信息" [ref=f2e53]:
          - generic [ref=f2e54]: 法律
          - link "隐私政策" [ref=f2e55] [cursor=pointer]:
            - /url: "#privacy"
          - link "用户协议" [ref=f2e56] [cursor=pointer]:
            - /url: "#terms"
          - link "版权声明" [ref=f2e57] [cursor=pointer]:
            - /url: "#copyright"
      - generic [ref=f2e58]:
        - paragraph [ref=f2e59]: © 2026 Atlas Reader · 仅供学习演示
        - paragraph [ref=f2e60]: 京 ICP 备 0000000 号 · 举报电话 000-00000000
```