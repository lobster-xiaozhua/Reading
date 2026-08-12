# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: performance.ts >> 性能指标巡检 >> C 端首页首屏加载 LCP 候选
- Location: monitoring/checks/performance.ts:41:7

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 5000
Received:   14144
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "跳到主内容" [ref=e4] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=e5]:
    - generic [ref=e6]:
      - link "Atlas 小说阅读 首页" [ref=e7] [cursor=pointer]:
        - /url: /
        - generic [ref=e8]: A
        - generic [ref=e9]: Atlas
      - navigation "主导航" [ref=e10]:
        - link "首页" [ref=e11] [cursor=pointer]:
          - /url: /
        - link "分类" [ref=e15] [cursor=pointer]:
          - /url: /category
        - link "搜索" [ref=e16] [cursor=pointer]:
          - /url: /search
      - search [ref=e17]:
        - searchbox "搜索" [ref=e18]
        - button "搜索" [ref=e19] [cursor=pointer]
      - link "游客读者 的个人中心" [ref=e24] [cursor=pointer]:
        - /url: /profile
        - img "游客读者" [ref=e25]:
          - generic [ref=e26]: 游
        - generic [ref=e27]: 游客读者
  - main [ref=e28]:
    - generic [ref=e29]:
      - region "推荐 Banner" [ref=e31]:
        - generic [ref=e32]:
          - link "推荐专题 1 - 热门小说推荐 1" [ref=e33] [cursor=pointer]:
            - /url: /book/
            - img "推荐专题 1" [ref=e35]
            - generic [ref=e37]:
              - heading "推荐专题 1" [level=3] [ref=e38]
              - paragraph [ref=e39]: 热门小说推荐 1
          - link [ref=e40] [cursor=pointer]:
            - /url: /book/
            - generic [ref=e44]:
              - heading [level=3] [ref=e45]: 推荐专题 2
              - paragraph [ref=e46]: 热门小说推荐 2
          - link [ref=e47] [cursor=pointer]:
            - /url: /book/
            - generic [ref=e51]:
              - heading [level=3] [ref=e52]: 推荐专题 3
              - paragraph [ref=e53]: 热门小说推荐 3
        - button "上一张" [ref=e56] [cursor=pointer]
        - button "下一张" [ref=e59] [cursor=pointer]
        - tablist "Banner 切换" [ref=e62]:
          - tab "第 1 张" [selected] [ref=e63] [cursor=pointer]
          - tab "第 2 张" [ref=e64] [cursor=pointer]
          - tab "第 3 张" [ref=e65] [cursor=pointer]
      - generic [ref=e66]:
        - generic [ref=e68]:
          - heading "编辑精选" [level=2] [ref=e69]
          - generic [ref=e70]: EDITOR PICK
        - generic [ref=e71]:
          - link "遮天 立即阅读 遮天 遮天：辰东 作品，示例内容用于演示。 辰东 4.7" [ref=e72] [cursor=pointer]:
            - /url: /book/3
            - generic [ref=e73]:
              - img "遮天" [ref=e75]
              - generic [ref=e76]: 立即阅读
            - generic [ref=e78]:
              - heading "遮天" [level=3] [ref=e79]
              - paragraph [ref=e80]: 遮天：辰东 作品，示例内容用于演示。
              - generic [ref=e81]:
                - generic [ref=e82]: 辰东
                - generic [ref=e83]:
                  - generic [ref=e84]: ★
                  - text: "4.7"
          - link "斗破苍穹 立即阅读 斗破苍穹 斗破苍穹：天蚕土豆 作品，示例内容用于演示。 天蚕土豆 4.5" [ref=e85] [cursor=pointer]:
            - /url: /book/1
            - generic [ref=e86]:
              - img "斗破苍穹" [ref=e88]
              - generic [ref=e89]: 立即阅读
            - generic [ref=e91]:
              - heading "斗破苍穹" [level=3] [ref=e92]
              - paragraph [ref=e93]: 斗破苍穹：天蚕土豆 作品，示例内容用于演示。
              - generic [ref=e94]:
                - generic [ref=e95]: 天蚕土豆
                - generic [ref=e96]:
                  - generic [ref=e97]: ★
                  - text: "4.5"
      - generic [ref=e98]:
        - generic [ref=e99]:
          - generic [ref=e100]:
            - heading "本周热门" [level=2] [ref=e101]
            - generic [ref=e102]: HOT
          - link "更多" [ref=e103] [cursor=pointer]:
            - /url: /category?sort=hot
        - generic [ref=e106]:
          - generic [ref=e107]:
            - generic [ref=e108]: "1"
            - button "凡人修仙传 忘语" [ref=e109] [cursor=pointer]:
              - img "凡人修仙传" [ref=e111]
              - generic [ref=e112]:
                - generic "凡人修仙传" [ref=e113]
                - generic "忘语" [ref=e114]
                - img "评分 4.6 星" [ref=e115]:
                  - generic [ref=e149]: "4.6"
                - generic [ref=e150]: 凡人修仙传：忘语 作品，示例内容用于演示。
                - generic [ref=e151]:
                  - generic [ref=e152]: 仙侠
                  - generic [ref=e153]: 修真
                  - generic [ref=e154]: 经典
          - generic [ref=e155]:
            - generic [ref=e156]: "2"
            - button "斗破苍穹 天蚕土豆" [ref=e157] [cursor=pointer]:
              - img "斗破苍穹" [ref=e159]
              - generic [ref=e160]:
                - generic "斗破苍穹" [ref=e161]
                - generic "天蚕土豆" [ref=e162]
                - img "评分 4.5 星" [ref=e163]:
                  - generic [ref=e197]: "4.5"
                - generic [ref=e198]: 斗破苍穹：天蚕土豆 作品，示例内容用于演示。
                - generic [ref=e199]:
                  - generic [ref=e200]: 热血
                  - generic [ref=e201]: 爽文
                  - generic [ref=e202]: 玄幻
      - generic [ref=e203]:
        - generic [ref=e204]:
          - generic [ref=e205]:
            - heading "限免专区" [level=2] [ref=e206]
            - generic [ref=e207]: FREE
          - link "更多" [ref=e208] [cursor=pointer]:
            - /url: /category?tag=free-limited
        - generic [ref=e212]:
          - generic [ref=e213]: 限免
          - button "斗破苍穹 天蚕土豆" [ref=e214] [cursor=pointer]:
            - img "斗破苍穹" [ref=e216]
            - generic [ref=e217]:
              - generic "斗破苍穹" [ref=e218]
              - generic "天蚕土豆" [ref=e219]
              - img "评分 4.5 星" [ref=e220]:
                - generic [ref=e254]: "4.5"
              - generic [ref=e255]: 斗破苍穹：天蚕土豆 作品，示例内容用于演示。
              - generic [ref=e256]:
                - generic [ref=e257]: 热血
                - generic [ref=e258]: 爽文
                - generic [ref=e259]: 玄幻
          - generic [ref=e260]: 限免中
      - generic [ref=e262]:
        - generic [ref=e263]:
          - generic [ref=e264]:
            - heading "分类入口" [level=2] [ref=e265]
            - generic [ref=e266]: CATEGORY
          - link "更多" [ref=e267] [cursor=pointer]:
            - /url: /category
        - generic [ref=e270]:
          - link "玄幻 0本" [ref=e271] [cursor=pointer]:
            - /url: /category?cat=%E7%8E%84%E5%B9%BB
            - generic [ref=e275]: 玄幻
            - generic [ref=e276]: 0本
          - link "仙侠 0本" [ref=e277] [cursor=pointer]:
            - /url: /category?cat=%E4%BB%99%E4%BE%A0
            - generic [ref=e281]: 仙侠
            - generic [ref=e282]: 0本
          - link "科幻 0本" [ref=e283] [cursor=pointer]:
            - /url: /category?cat=%E7%A7%91%E5%B9%BB
            - generic [ref=e289]: 科幻
            - generic [ref=e290]: 0本
          - link "言情 0本" [ref=e291] [cursor=pointer]:
            - /url: /category?cat=%E8%A8%80%E6%83%85
            - generic [ref=e295]: 言情
            - generic [ref=e296]: 0本
          - link "都市 0本" [ref=e297] [cursor=pointer]:
            - /url: /category?cat=%E9%83%BD%E5%B8%82
            - generic [ref=e303]: 都市
            - generic [ref=e304]: 0本
      - generic [ref=e305]:
        - generic [ref=e307]:
          - heading "排行榜" [level=2] [ref=e308]
          - generic [ref=e309]: RANKING
        - generic [ref=e310]:
          - tablist "排行榜切换" [ref=e311]:
            - tab "人气榜" [selected] [ref=e312] [cursor=pointer]
            - tab "收藏榜" [ref=e313] [cursor=pointer]
            - tab "月票榜" [ref=e314] [cursor=pointer]
            - tab "新书榜" [ref=e315] [cursor=pointer]
          - link "完整榜单 ›" [ref=e316] [cursor=pointer]:
            - /url: /category?sort=hot
        - list [ref=e317]:
          - listitem [ref=e318]:
            - generic [ref=e319]: "1"
            - link "遮天 辰东" [ref=e320] [cursor=pointer]:
              - /url: /book/3
              - generic [ref=e321]: 遮天
              - generic [ref=e322]: 辰东
            - generic [ref=e323]: "4.7"
          - listitem [ref=e324]:
            - generic [ref=e325]: "2"
            - link "凡人修仙传 忘语" [ref=e326] [cursor=pointer]:
              - /url: /book/2
              - generic [ref=e327]: 凡人修仙传
              - generic [ref=e328]: 忘语
            - generic [ref=e329]: "4.6"
          - listitem [ref=e330]:
            - generic [ref=e331]: "3"
            - link "斗破苍穹 天蚕土豆" [ref=e332] [cursor=pointer]:
              - /url: /book/1
              - generic [ref=e333]: 斗破苍穹
              - generic [ref=e334]: 天蚕土豆
            - generic [ref=e335]: "4.5"
  - contentinfo [ref=e336]:
    - generic [ref=e337]:
      - generic [ref=e338]:
        - generic [ref=e339]: Atlas 阅读
        - paragraph [ref=e344]: 沉浸阅读，发现好书
        - list [ref=e345]:
          - listitem [ref=e346]:
            - generic [ref=e349]: 多主题沉浸式阅读
          - listitem [ref=e350]:
            - generic [ref=e354]: 智能推荐，懂你所想
          - listitem [ref=e355]:
            - generic [ref=e358]: 书架同步，随时续读
      - generic [ref=e359]:
        - navigation "页面导航" [ref=e360]:
          - generic [ref=e361]: 导航
          - link "首页" [ref=e362] [cursor=pointer]:
            - /url: /
          - link "分类" [ref=e363] [cursor=pointer]:
            - /url: /category
          - link "搜索" [ref=e364] [cursor=pointer]:
            - /url: /search
          - link "个人中心" [ref=e365] [cursor=pointer]:
            - /url: /profile
        - navigation "法律信息" [ref=e366]:
          - generic [ref=e367]: 法律
          - link "隐私政策" [ref=e368] [cursor=pointer]:
            - /url: "#privacy"
          - link "用户协议" [ref=e369] [cursor=pointer]:
            - /url: "#terms"
          - link "版权声明" [ref=e370] [cursor=pointer]:
            - /url: "#copyright"
      - generic [ref=e371]:
        - paragraph [ref=e372]: © 2026 Atlas Reader · 仅供学习演示
        - paragraph [ref=e373]: 京 ICP 备 0000000 号 · 举报电话 000-00000000
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const BACKEND = 'http://localhost:8000';
  4  | 
  5  | test.describe('性能指标巡检', () => {
  6  |   test('搜索接口响应时间 P95 < 500ms', async ({ request }) => {
  7  |     const times: number[] = [];
  8  |     for (let i = 0; i < 20; i++) {
  9  |       const start = Date.now();
  10 |       const res = await request.get(`${BACKEND}/api/v1/c/search/books`, {
  11 |         params: { keyword: 'test', page: 1, page_size: 12 },
  12 |       });
  13 |       times.push(Date.now() - start);
  14 |       expect(res.ok()).toBeTruthy();
  15 |     }
  16 |     times.sort((a, b) => a - b);
  17 |     // 20 样本的 P95 = 第 19 个（索引 18），即 95% 分位
  18 |     const idx = Math.floor((times.length - 1) * 0.95);
  19 |     const p95 = times[idx] ?? times[times.length - 1]!;
  20 |     expect(p95).toBeLessThan(500);
  21 |   });
  22 | 
  23 |   test('首页发现页接口响应时间 < 300ms', async ({ request }) => {
  24 |     const start = Date.now();
  25 |     const res = await request.get(`${BACKEND}/api/v1/c/discovery/home`);
  26 |     const duration = Date.now() - start;
  27 |     expect(res.ok()).toBeTruthy();
  28 |     expect(duration).toBeLessThan(300);
  29 |   });
  30 | 
  31 |   test('书籍列表接口响应时间 < 300ms', async ({ request }) => {
  32 |     const start = Date.now();
  33 |     const res = await request.get(`${BACKEND}/api/v1/c/books`, {
  34 |       params: { page: 1, page_size: 20 },
  35 |     });
  36 |     const duration = Date.now() - start;
  37 |     expect(res.ok()).toBeTruthy();
  38 |     expect(duration).toBeLessThan(300);
  39 |   });
  40 | 
  41 |   test('C 端首页首屏加载 LCP 候选', async ({ page }) => {
  42 |     const start = Date.now();
  43 |     await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  44 |     const domReady = Date.now() - start;
> 45 |     expect(domReady).toBeLessThan(5000);
     |                      ^ Error: expect(received).toBeLessThan(expected)
  46 |   });
  47 | 
  48 |   test('B 端登录页首屏加载', async ({ page }) => {
  49 |     const start = Date.now();
  50 |     await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
  51 |     const domReady = Date.now() - start;
  52 |     expect(domReady).toBeLessThan(5000);
  53 |   });
  54 | });
```