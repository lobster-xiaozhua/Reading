# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: business-flow.ts >> 业务链路巡检 >> C 端阅读全流程: 首页 → 书籍详情 → 阅读页
- Location: monitoring/checks/business-flow.ts:49:7

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- status [ref=f2e5]:
  - generic [ref=f2e11]: 暂无章节
  - generic [ref=f2e12]: 该书可能还在筹备中
  - button "返回详情" [ref=f2e14] [cursor=pointer]
```