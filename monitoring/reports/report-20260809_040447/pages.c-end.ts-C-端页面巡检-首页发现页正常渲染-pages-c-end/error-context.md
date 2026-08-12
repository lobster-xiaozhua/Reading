# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pages.c-end.ts >> C 端页面巡检 >> 首页发现页正常渲染
- Location: monitoring/checks/pages.c-end.ts:6:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('.discover-page__banner')
Expected: visible
Received: undefined

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('.discover-page__banner')
  - Protocol error (Runtime.callFunctionOn): Internal server error, session closed.

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
      - button "登录" [ref=e21] [cursor=pointer]
  - main [ref=e22]:
    - generic [ref=e23]:
      - region "推荐 Banner" [ref=e25]:
        - generic [ref=e26]:
          - link "推荐专题 1 - 热门小说推荐 1" [ref=e27] [cursor=pointer]:
            - /url: /book/
            - img "推荐专题 1" [ref=e30]
            - generic [ref=e32]:
              - heading "推荐专题 1" [level=3] [ref=e33]
              - paragraph [ref=e34]: 热门小说推荐 1
          - link [ref=e35] [cursor=pointer]:
            - /url: /book/
            - generic [ref=e39]:
              - heading [level=3] [ref=e40]: 推荐专题 2
              - paragraph [ref=e41]: 热门小说推荐 2
          - link [ref=e42] [cursor=pointer]:
            - /url: /book/
            - generic [ref=e46]:
              - heading [level=3] [ref=e47]: 推荐专题 3
              - paragraph [ref=e48]: 热门小说推荐 3
        - button "上一张" [ref=e51] [cursor=pointer]
        - button "下一张" [ref=e54] [cursor=pointer]
        - tablist "Banner 切换" [ref=e57]:
          - tab "第 1 张" [selected] [ref=e58] [cursor=pointer]
          - tab "第 2 张" [ref=e59] [cursor=pointer]
          - tab "第 3 张" [ref=e60] [cursor=pointer]
      - generic [ref=e61]:
        - generic [ref=e63]:
          - heading "编辑精选" [level=2] [ref=e64]
          - generic [ref=e65]: EDITOR PICK
        - generic [ref=e66]:
          - link "立即阅读 遮天 遮天：辰东 作品，示例内容用于演示。 辰东 4.7" [ref=e67] [cursor=pointer]:
            - /url: /book/3
            - generic [ref=e68]: 立即阅读
            - generic [ref=e73]:
              - heading "遮天" [level=3] [ref=e74]
              - paragraph [ref=e75]: 遮天：辰东 作品，示例内容用于演示。
              - generic [ref=e76]:
                - generic [ref=e77]: 辰东
                - generic [ref=e78]:
                  - generic [ref=e79]: ★
                  - text: "4.7"
          - link "立即阅读 斗破苍穹 斗破苍穹：天蚕土豆 作品，示例内容用于演示。 天蚕土豆 4.5" [ref=e80] [cursor=pointer]:
            - /url: /book/1
            - generic [ref=e81]: 立即阅读
            - generic [ref=e86]:
              - heading "斗破苍穹" [level=3] [ref=e87]
              - paragraph [ref=e88]: 斗破苍穹：天蚕土豆 作品，示例内容用于演示。
              - generic [ref=e89]:
                - generic [ref=e90]: 天蚕土豆
                - generic [ref=e91]:
                  - generic [ref=e92]: ★
                  - text: "4.5"
      - generic [ref=e93]:
        - generic [ref=e94]:
          - generic [ref=e95]:
            - heading "本周热门" [level=2] [ref=e96]
            - generic [ref=e97]: HOT
          - link "更多" [ref=e98] [cursor=pointer]:
            - /url: /category?sort=hot
        - generic [ref=e101]:
          - generic [ref=e102]:
            - generic [ref=e103]: "1"
            - button "凡人修仙传 忘语" [ref=e104] [cursor=pointer]:
              - img "凡人修仙传" [ref=e106]
              - generic [ref=e107]:
                - generic "凡人修仙传" [ref=e108]
                - generic "忘语" [ref=e109]
                - img "评分 4.6 星" [ref=e110]:
                  - generic [ref=e144]: "4.6"
                - generic [ref=e145]: 凡人修仙传：忘语 作品，示例内容用于演示。
                - generic [ref=e146]:
                  - generic [ref=e147]: 仙侠
                  - generic [ref=e148]: 修真
                  - generic [ref=e149]: 经典
          - generic [ref=e150]:
            - generic [ref=e151]: "2"
            - button "斗破苍穹 天蚕土豆" [ref=e152] [cursor=pointer]:
              - img "斗破苍穹" [ref=e154]
              - generic [ref=e155]:
                - generic "斗破苍穹" [ref=e156]
                - generic "天蚕土豆" [ref=e157]
                - img "评分 4.5 星" [ref=e158]:
                  - generic [ref=e192]: "4.5"
                - generic [ref=e193]: 斗破苍穹：天蚕土豆 作品，示例内容用于演示。
                - generic [ref=e194]:
                  - generic [ref=e195]: 热血
                  - generic [ref=e196]: 爽文
                  - generic [ref=e197]: 玄幻
      - generic [ref=e198]:
        - generic [ref=e199]:
          - generic [ref=e200]:
            - heading "限免专区" [level=2] [ref=e201]
            - generic [ref=e202]: FREE
          - link "更多" [ref=e203] [cursor=pointer]:
            - /url: /category?tag=free-limited
        - generic [ref=e207]:
          - generic [ref=e208]: 限免
          - button "斗破苍穹 天蚕土豆" [ref=e209] [cursor=pointer]:
            - img "斗破苍穹" [ref=e211]
            - generic [ref=e212]:
              - generic "斗破苍穹" [ref=e213]
              - generic "天蚕土豆" [ref=e214]
              - img "评分 4.5 星" [ref=e215]:
                - generic [ref=e249]: "4.5"
              - generic [ref=e250]: 斗破苍穹：天蚕土豆 作品，示例内容用于演示。
              - generic [ref=e251]:
                - generic [ref=e252]: 热血
                - generic [ref=e253]: 爽文
                - generic [ref=e254]: 玄幻
          - generic [ref=e255]: 限免中
      - generic [ref=e257]:
        - generic [ref=e258]:
          - generic [ref=e259]:
            - heading "分类入口" [level=2] [ref=e260]
            - generic [ref=e261]: CATEGORY
          - link "更多" [ref=e262] [cursor=pointer]:
            - /url: /category
        - generic [ref=e265]:
          - link "玄幻 0本" [ref=e266] [cursor=pointer]:
            - /url: /category?cat=%E7%8E%84%E5%B9%BB
            - generic [ref=e270]: 玄幻
            - generic [ref=e271]: 0本
          - link "仙侠 0本" [ref=e272] [cursor=pointer]:
            - /url: /category?cat=%E4%BB%99%E4%BE%A0
            - generic [ref=e276]: 仙侠
            - generic [ref=e277]: 0本
          - link "科幻 0本" [ref=e278] [cursor=pointer]:
            - /url: /category?cat=%E7%A7%91%E5%B9%BB
            - generic [ref=e284]: 科幻
            - generic [ref=e285]: 0本
          - link "言情 0本" [ref=e286] [cursor=pointer]:
            - /url: /category?cat=%E8%A8%80%E6%83%85
            - generic [ref=e290]: 言情
            - generic [ref=e291]: 0本
          - link "都市 0本" [ref=e292] [cursor=pointer]:
            - /url: /category?cat=%E9%83%BD%E5%B8%82
            - generic [ref=e298]: 都市
            - generic [ref=e299]: 0本
      - generic [ref=e300]:
        - generic [ref=e302]:
          - heading "排行榜" [level=2] [ref=e303]
          - generic [ref=e304]: RANKING
        - generic [ref=e305]:
          - tablist "排行榜切换" [ref=e306]:
            - tab "人气榜" [selected] [ref=e307] [cursor=pointer]
            - tab "收藏榜" [ref=e308] [cursor=pointer]
            - tab "月票榜" [ref=e309] [cursor=pointer]
            - tab "新书榜" [ref=e310] [cursor=pointer]
          - link "完整榜单 ›" [ref=e311] [cursor=pointer]:
            - /url: /category?sort=hot
        - list [ref=e312]:
          - listitem [ref=e313]:
            - generic [ref=e314]: "1"
            - link "遮天 辰东" [ref=e315] [cursor=pointer]:
              - /url: /book/3
              - generic [ref=e316]: 遮天
              - generic [ref=e317]: 辰东
            - generic [ref=e318]: "4.7"
          - listitem [ref=e319]:
            - generic [ref=e320]: "2"
            - link "凡人修仙传 忘语" [ref=e321] [cursor=pointer]:
              - /url: /book/2
              - generic [ref=e322]: 凡人修仙传
              - generic [ref=e323]: 忘语
            - generic [ref=e324]: "4.6"
          - listitem [ref=e325]:
            - generic [ref=e326]: "3"
            - link "斗破苍穹 天蚕土豆" [ref=e327] [cursor=pointer]:
              - /url: /book/1
              - generic [ref=e328]: 斗破苍穹
              - generic [ref=e329]: 天蚕土豆
            - generic [ref=e330]: "4.5"
  - contentinfo [ref=e331]:
    - generic [ref=e332]:
      - generic [ref=e333]:
        - generic [ref=e334]: Atlas 阅读
        - paragraph [ref=e339]: 沉浸阅读，发现好书
        - list [ref=e340]:
          - listitem [ref=e341]:
            - generic [ref=e344]: 多主题沉浸式阅读
          - listitem [ref=e345]:
            - generic [ref=e349]: 智能推荐，懂你所想
          - listitem [ref=e350]:
            - generic [ref=e353]: 书架同步，随时续读
      - generic [ref=e354]:
        - navigation "页面导航" [ref=e355]:
          - generic [ref=e356]: 导航
          - link "首页" [ref=e357] [cursor=pointer]:
            - /url: /
          - link "分类" [ref=e358] [cursor=pointer]:
            - /url: /category
          - link "搜索" [ref=e359] [cursor=pointer]:
            - /url: /search
          - link "个人中心" [ref=e360] [cursor=pointer]:
            - /url: /profile
        - navigation "法律信息" [ref=e361]:
          - generic [ref=e362]: 法律
          - link "隐私政策" [ref=e363] [cursor=pointer]:
            - /url: "#privacy"
          - link "用户协议" [ref=e364] [cursor=pointer]:
            - /url: "#terms"
          - link "版权声明" [ref=e365] [cursor=pointer]:
            - /url: "#copyright"
      - generic [ref=e366]:
        - paragraph [ref=e367]: © 2026 Atlas Reader · 仅供学习演示
        - paragraph [ref=e368]: 京 ICP 备 0000000 号 · 举报电话 000-00000000
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const WEB = 'http://localhost:5173';
  4  | 
  5  | test.describe('C 端页面巡检', () => {
  6  |   test('首页发现页正常渲染', async ({ page }) => {
  7  |     await page.goto(WEB, { waitUntil: 'domcontentloaded' });
  8  |     await expect(page.locator('body')).toBeAttached();
  9  |     await expect(page.locator('.discover-page')).toBeAttached();
> 10 |     await expect(page.locator('.discover-page__banner')).toBeVisible();
     |                                                          ^ Error: expect(locator).toBeVisible() failed
  11 |     // 聚合 6 模块：banner、编辑推荐、热门、限免、分类、排行榜
  12 |     const sections = page.locator('.discover-page__section');
  13 |     await expect(sections.first()).toBeAttached();
  14 |     // 排行榜 Tab 切换
  15 |     await expect(page.locator('.discover-page__rank-tabs')).toBeVisible();
  16 |     const rankTabs = page.locator('.discover-page__rank-tab');
  17 |     await expect(rankTabs.first()).toBeAttached();
  18 |   });
  19 | 
  20 |   test('发现页限免区域有倒计时或标签', async ({ page }) => {
  21 |     await page.goto(WEB, { waitUntil: 'domcontentloaded' });
  22 |     await expect(page.locator('.discover-page')).toBeAttached();
  23 |     const freeBadge = page.locator('.discover-page__free-badge');
  24 |     const countdown = page.locator('.novel-countdown');
  25 |     // 至少有一个限免标识（标签或倒计时）
  26 | const badgeCount = await freeBadge.count();
  27 |     const countdownCount = await countdown.count();
  28 |     // 至少有一个限免标识（标签或倒计时）或页面无限免数据
  29 |     if (badgeCount > 0 || countdownCount > 0) {
  30 |       expect(badgeCount + countdownCount).toBeGreaterThan(0);
  31 |     }
  32 |   });
  33 | 
  34 |   test('登录页正常渲染', async ({ page }) => {
  35 |     await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
  36 |     await expect(page.locator('body')).toBeAttached();
  37 |   });
  38 | 
  39 |   test('书籍详情页可访问', async ({ page }) => {
  40 |     await page.goto(`${WEB}/book/1`, { waitUntil: 'domcontentloaded' });
  41 |     await expect(page.locator('body')).toBeAttached();
  42 |   });
  43 | 
  44 |   test('分类页含二级分类', async ({ page }) => {
  45 |     await page.goto(`${WEB}/category`, { waitUntil: 'domcontentloaded' });
  46 |     await expect(page.locator('.category-page')).toBeAttached();
  47 |     // 二级分类列表
  48 |     const subLists = page.locator('.category-page__cat-sub');
  49 |     const subCount = await subLists.count();
  50 |     expect(subCount).toBeGreaterThanOrEqual(1);
  51 |     // 排序 Tab
  52 |     await expect(page.locator('.category-page__sort-tabs')).toBeVisible();
  53 |   });
  54 | 
  55 |   test('搜索页可搜索并显示加载更多', async ({ page }) => {
  56 |     await page.goto(`${WEB}/search`, { waitUntil: 'domcontentloaded' });
  57 |     await expect(page.locator('.search-page')).toBeAttached();
  58 |     // 输入搜索词
  59 |     const input = page.locator('.search-page__input');
  60 |     await input.fill('测试');
  61 |     await page.locator('.search-page__submit').click();
  62 |     // 等待结果或空状态
  63 |     await page.waitForTimeout(2000);
  64 |     // 如果有结果，检查加载更多按钮
  65 |     const loadMore = page.locator('.search-page__loadmore');
  66 |     if ((await loadMore.count()) > 0) {
  67 |       await expect(loadMore).toBeVisible();
  68 |     }
  69 |   });
  70 | 
  71 |   test('404 页面正常渲染', async ({ page }) => {
  72 |     await page.goto(`${WEB}/nonexistent-route-test`, { waitUntil: 'domcontentloaded' });
  73 |     await expect(page.locator('body')).toBeAttached();
  74 |   });
  75 | 
  76 |   test('控制台无重大错误', async ({ page }) => {
  77 |     const errors: string[] = [];
  78 |     page.on('console', (msg) => {
  79 |       if (msg.type() === 'error') errors.push(msg.text());
  80 |     });
  81 |     page.on('pageerror', (err) => errors.push(err.message));
  82 | 
  83 |     await page.goto(WEB, { waitUntil: 'domcontentloaded' });
  84 |     expect(errors.filter((e) => !e.includes('favicon') && !e.includes('analytics')).length).toBe(0);
  85 |   });
  86 | });
```