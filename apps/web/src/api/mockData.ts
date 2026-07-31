/* ============================================================
 * P5 · Mock 数据集
 * 用于本地演示，覆盖发现页/详情页/分类/搜索/个人中心所需
 * ============================================================ */
import type {
  Banner,
  BookList,
  BookSummary,
  Category,
  ChapterContent,
  ChapterSummary,
  Comment,
  RatingDistribution,
  ReadingHistoryItem,
  RewardRecord,
  Tag,
  UserProfile,
} from './types';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

/** 通用封面占位（避免外部图片依赖） */
function cover(seed: string, hue: number): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320" viewBox="0 0 240 320">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="hsl(${hue}, 65%, 55%)"/>
          <stop offset="1" stop-color="hsl(${(hue + 40) % 360}, 70%, 35%)"/>
        </linearGradient>
      </defs>
      <rect width="240" height="320" fill="url(#g)"/>
      <text x="120" y="170" font-family="serif" font-size="36" font-weight="600" fill="rgba(255,255,255,0.92)" text-anchor="middle">${seed}</text>
    </svg>`,
  )}`;
}

const BOOK_TITLES = [
  '雪中悍刀行', '诡秘之主', '斗破苍穹', '凡人修仙传', '庆余年',
  '诛仙', '择天记', '将夜', '遮天', '完美世界',
  '一念永恒', '剑来', '圣墟', '牧神记', '大奉打更人',
  '夜的命名术', '灵境行者', '道诡异仙', '赤心巡天', '渊天记',
];

const AUTHORS = ['烽火戏诸侯', '爱潜水的乌贼', '天蚕土豆', '忘语', '猫腻', '萧鼎', '猫腻', '猫腻', '辰东', '辰东', '耳根', '烽火戏诸侯', '辰东', '宅猪', '卖报小郎君', '会说话的肘子', '三天两觉', '狐尾的笔', '情何以甚', '烽火戏诸侯'];

const CATEGORIES_BY_HUE: Record<string, number> = {
  玄幻: 210, 都市: 280, 武侠: 30, 历史: 45, 科幻: 200,
  悬疑: 0, 言情: 340, 奇幻: 160, 军事: 120, 游戏: 180,
  体育: 90, 灵异: 270,
};

const CATEGORY_NAMES = Object.keys(CATEGORIES_BY_HUE);

const INTROS = [
  '江湖路远，刀剑如梦。少年走出凉州，只为寻一个答案。',
  '迷雾笼罩的世界里，他握住了命运的钥匙，却不知代价几何。',
  '少年自荒漠而出，背负血海深仇，踏上修真之路。',
  '一介凡人，逆天改命。修仙路上，步步惊心。',
  '庙堂之上，江湖之远，权谋与情义交织成网。',
  '青云直上，正邪之争。少年执剑，斩断宿命。',
  '命由天定？我偏要逆天改命，踏碎凌霄。',
  '夜色深沉，书生提笔，写下人间百态。',
  '洪荒纪元，万族争锋。少年从荒漠中走出，问鼎苍穹。',
  '完美世界，残缺之美。少年追寻大道，一路荆棘。',
];

const TAGS_POOL = ['热血', '爽文', '升级', '权谋', '修真', '玄幻', '武侠', '穿越', '重生', '系统', '无敌', '扮猪吃老虎', '群像', '虐心', '甜宠'];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function pickTags(seed: number): string[] {
  const start = seed % TAGS_POOL.length;
  return [TAGS_POOL[start], TAGS_POOL[(start + 3) % TAGS_POOL.length], TAGS_POOL[(start + 5) % TAGS_POOL.length]];
}

/** 20 本书的完整数据 */
export const BOOKS: BookSummary[] = BOOK_TITLES.map((title, i) => {
  const category = pick(CATEGORY_NAMES, i);
  const status: BookSummary['status'] = i % 4 === 0 ? 'completed' : 'ongoing';
  const flags: BookSummary['flags'] = [];
  if (i % 3 === 0) flags.push('hot');
  if (i % 5 === 0) flags.push('vip');
  if (i % 7 === 0) flags.push('free-limited');
  if (i % 4 === 0) flags.push('editor-pick');
  return {
    id: `book-${i + 1}`,
    title,
    author: pick(AUTHORS, i),
    cover: cover(title.slice(0, 2), CATEGORIES_BY_HUE[category]),
    category,
    tags: pickTags(i),
    wordCount: 500000 + i * 137000 + (i % 7) * 9800,
    status,
    rating: Math.round((7 + (i % 3) + (i % 5) * 0.1) * 10) / 10,
    ratingCount: 12000 + i * 2345,
    followCount: 80000 + i * 5678,
    clickCount: 1000000 + i * 89000,
    intro: pick(INTROS, i),
    flags,
    lastUpdated: now - (i % 10) * 3600 * 1000,
  };
});

/** 分类树（12 项，3×4 网格） */
export const CATEGORIES: Category[] = CATEGORY_NAMES.map((name, i) => ({
  id: `cat-${i + 1}`,
  name,
  icon: `cat-${i + 1}`,
  count: 1000 + i * 234,
}));

/** 标签池 */
export const TAGS: Tag[] = TAGS_POOL.map((name, i) => ({
  id: `tag-${i + 1}`,
  name,
  count: 200 + i * 53,
}));

/** Banner 5 张 */
export const BANNERS: Banner[] = [0, 1, 2, 3, 4].map((i) => {
  const book = BOOKS[i * 3];
  return {
    id: `banner-${i + 1}`,
    bookId: book.id,
    title: book.title,
    subtitle: pick(INTROS, i),
    cover: book.cover,
    accent: `hsl(${CATEGORIES_BY_HUE[book.category]}, 65%, 50%)`,
  };
});

/** 为每本书生成章节目录（30-120 章） */
export const CHAPTERS: Record<string, ChapterSummary[]> = BOOKS.reduce((acc, book, bi) => {
  const total = 30 + (bi % 10) * 10;
  const chapters: ChapterSummary[] = Array.from({ length: total }).map((_, i) => ({
    id: `${book.id}-ch-${i + 1}`,
    bookId: book.id,
    index: i + 1,
    title: `第${i + 1}章 ${chapterTitle(i, bi)}`,
    wordCount: 2000 + (i % 5) * 300,
    isVip: i > total * 0.7 && book.flags.includes('vip'),
    publishedAt: now - (total - i) * 3600 * 1000,
  }));
  acc[book.id] = chapters;
  return acc;
}, {} as Record<string, ChapterSummary[]>);

function chapterTitle(i: number, bi: number): string {
  const titles = ['风起', '云涌', '剑出', '江湖', '夜行', '破晓', '问鼎', '苍穹', '归途', '问道', '初遇', '惊变', '对决', '深入', '觉醒', '前夜', '交锋', '落幕', '序章', '终章'];
  return `${pick(titles, i + bi)}${pick(['录', '记', '传', '篇', '志'], i)}`;
}

/** 章节正文（按需生成段落） */
function generateParagraphs(bookTitle: string, chapterTitle: string, seed: number): string[] {
  const sentences = [
    `「${bookTitle}」的开篇，总带着几分宿命的味道。`,
    `少年站在山门前，回望来时路，风雪漫天。`,
    `剑未出鞘，已染霜寒。他想起师父临终前的叮嘱。`,
    `「修行一途，重在心志，不在天赋。」这句话他记了一辈子。`,
    `远处钟声响起，惊起一群飞鸟。少年收回思绪，迈步向前。`,
    `江湖路远，前方的迷雾里，藏着多少未知的险阻与机缘。`,
    `他不知道的是，这一步踏出，便是另一番天地。`,
    `山下的酒肆里，几名江湖客正高谈阔论，议论着近来的大事。`,
    `「听说了吗？北境出了个少年天才，一剑斩了千年妖物。」`,
    `少年的名字，从这一日开始，被人传遍天下。`,
    `夜色渐深，他寻了一处山洞歇脚，篝火跳动，映出眉宇间的疲惫。`,
    `怀里揣着的那卷古籍，是他唯一的线索。`,
    `「若想解开身世之谜，须得去天涯海角，寻找那座失落的古城。」`,
    `他闭目调息，体内真气流转，渐入佳境。`,
    `忽然，洞外传来脚步声，他倏地睁眼，手按上了剑柄。`,
    `来的不是敌人，是个一身白衣的少女，怀抱古琴，眉目如画。`,
    `「借问兄台，此地可还有路通往山顶？」她声音清脆，如珠落玉盘。`,
    `少年点头，指了指东边的羊肠小道，少女道谢离去，留下一缕暗香。`,
    `他不知道，这次短暂的相遇，将会改变他往后的一生。`,
    `风雪依旧，故事才刚刚开始。`,
  ];
  const paras: string[] = [];
  const count = 8 + (seed % 4);
  for (let i = 0; i < count; i++) {
    const start = (seed + i) % sentences.length;
    paras.push(sentences[start]);
  }
  paras.unshift(`${chapterTitle}`);
  return paras;
}

/** 获取章节正文 */
export function getChapterContent(bookId: string, chapterId: string): ChapterContent {
  const chapters = CHAPTERS[bookId] ?? [];
  const idx = chapters.findIndex((c) => c.id === chapterId);
  const summary = chapters[idx];
  const book = BOOKS.find((b) => b.id === bookId)!;
  return {
    ...summary,
    paragraphs: generateParagraphs(book.title, summary.title, summary.index),
    prevId: idx > 0 ? chapters[idx - 1].id : null,
    nextId: idx < chapters.length - 1 ? chapters[idx + 1].id : null,
  };
}

/** 评论与评分分布 */
export const COMMENTS: Comment[] = BOOKS.slice(0, 10).flatMap((book, bi) =>
  Array.from({ length: 4 + (bi % 3) }).map((_, ci) => ({
    id: `${book.id}-c-${ci + 1}`,
    bookId: book.id,
    user: {
      id: `u-${bi}-${ci}`,
      nickname: pick(['书虫小李', '夜读人', '追更党', '老书虫', '新手读者', '沉默的看客'], bi + ci),
      avatar: cover(pick(['李', '夜', '追', '虫', '新', '默'], bi + ci).slice(0, 1), (bi + ci) * 30),
    },
    rating: 3 + ((bi + ci) % 3),
    content: pick([
      '这本书设定宏大，世界观完整，强推！',
      '主角智商在线，剧情不拖沓，追更中。',
      '前半段惊艳，中段略水，但整体值得一看。',
      '文笔老练，人物塑造立体，是近期难得的佳作。',
      '追了三年，舍不得完结，希望作者再写一部。',
    ], bi + ci),
    likes: 10 + (bi + ci) * 7,
    createdAt: now - (bi + ci) * DAY,
    replies: ci === 0 ? [{
      id: `${book.id}-c-${ci + 1}-r1`,
      bookId: book.id,
      user: { id: 'u-author', nickname: book.author, avatar: cover('作', 200) },
      rating: 5,
      content: '感谢支持，会继续努力更文~',
      likes: 88,
      createdAt: now - (bi + ci) * DAY + 3600 * 1000,
    }] : undefined,
  })),
);

export function getRatingDistribution(bookId: string): RatingDistribution {
  const bookComments = COMMENTS.filter((c) => c.bookId === bookId);
  const buckets = [5, 4, 3, 2, 1].map((star) => {
    const count = bookComments.filter((c) => c.rating === star).length + (5 - star) * 12 + star * 30;
    return { star, count };
  });
  const total = buckets.reduce((s, b) => s + b.count, 0);
  const sum = buckets.reduce((s, b) => s + b.star * b.count, 0);
  return {
    total,
    average: Math.round((sum / total) * 10) / 10,
    buckets: buckets.map((b) => ({ ...b, percent: Math.round((b.count / total) * 100) })),
  };
}

/** 当前登录用户 */
export const CURRENT_USER: UserProfile = {
  id: 'u-me',
  nickname: '书友·青云',
  avatar: cover('青', 200),
  level: 28,
  isVip: true,
  vipExpireAt: now + 90 * DAY,
  stats: {
    readingDays: 128,
    readingMinutes: 18720,
    readWords: 8640000,
    bookshelfCount: 24,
  },
};

/** 阅读历史 */
export const READING_HISTORY: ReadingHistoryItem[] = BOOKS.slice(0, 8).map((book, i) => {
  const chapters = CHAPTERS[book.id];
  const chapterIdx = Math.floor(chapters.length * 0.3) + i;
  const chapter = chapters[Math.min(chapterIdx, chapters.length - 1)];
  return {
    bookId: book.id,
    book,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    chapterIndex: chapter.index,
    percent: Math.round((chapterIdx / chapters.length) * 100),
    readAt: now - i * DAY * 2,
  };
});

/** 书单 */
export const BOOK_LISTS: BookList[] = [
  { id: 'bl-1', title: '经典玄幻必读书单', desc: '十年老书虫精选，本本完结爽文', cover: BOOKS[0].cover, bookCount: 12, followCount: 3400, createdAt: now - 60 * DAY },
  { id: 'bl-2', title: '深夜治愈系', desc: '适合睡前阅读的温暖故事', cover: BOOKS[6].cover, bookCount: 8, followCount: 2100, createdAt: now - 40 * DAY },
  { id: 'bl-3', title: '硬核科幻推荐', desc: '脑洞大开的科幻佳作合集', cover: BOOKS[2].cover, bookCount: 10, followCount: 1800, createdAt: now - 20 * DAY },
];

/** 打赏记录 */
export const REWARD_RECORDS: RewardRecord[] = BOOKS.slice(0, 6).map((book, i) => ({
  id: `rw-${i + 1}`,
  bookId: book.id,
  bookTitle: book.title,
  type: pick<RewardRecord['type']>(['ticket', 'recommend', 'tip'], i),
  amount: pick([1, 2, 5, 10, 20], i),
  createdAt: now - i * DAY * 3,
}));

/** 热门搜索词 */
export const HOT_SEARCHES = ['雪中悍刀行', '诡秘之主', '修仙', '系统文', '爽文', '权谋', '猫腻', '辰东', '完结', '新书'];

/** 搜索历史（localStorage 持久化） */
export const SEARCH_HISTORY_KEY = 'atlas-search-history';
