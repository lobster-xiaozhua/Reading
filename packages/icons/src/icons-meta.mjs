// 图标元数据：name + path 内容
// 全部遵循 24×24 viewbox / 1.8px 描边 / currentColor
// Source: 02-通用设计.md §3.2（60 通用）+ §3.3（25 小说专用）
//
// 实心变体（bookmark-filled / heart-filled）通过 fill="currentColor" + stroke="none" 实现，
// 生成代码中识别 _filled 后缀做特殊处理。

/**
 * @typedef {Object} IconDef
 * @property {string} exportName 导出名（PascalCase），如 ActionAdd
 * @property {string} kebab kebab-case 名称
 * @property {string} category 类别
 * @property {string} desc 用途说明
 * @property {string} body SVG 内部子元素
 * @property {boolean} [filled] 是否实心变体
 */

/* ---------- 工具：常用 path 片段 ---------- */

// 通用：圆角矩形关闭按钮
const X_PATH = '<path d="M6 6l12 12M18 6L6 18"/>';

export const ICONS = [
  /* ============ Action 类（15） ============ */
  { exportName: 'ActionAdd', kebab: 'action-add', category: 'action', desc: '新建/添加', body: '<path d="M12 5v14M5 12h14"/>' },
  { exportName: 'ActionEdit', kebab: 'action-edit', category: 'action', desc: '编辑', body: '<path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3z"/><path d="M13.5 6.5l3 3"/>' },
  { exportName: 'ActionDelete', kebab: 'action-delete', category: 'action', desc: '删除', body: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>' },
  { exportName: 'ActionSave', kebab: 'action-save', category: 'action', desc: '保存', body: '<path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M7 4v6h8V4"/><path d="M7 14h10v6H7z"/>' },
  { exportName: 'ActionSearch', kebab: 'action-search', category: 'action', desc: '搜索', body: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>' },
  { exportName: 'ActionFilter', kebab: 'action-filter', category: 'action', desc: '筛选', body: '<path d="M4 5h16l-6 7v6l-4 2v-8L4 5z"/>' },
  { exportName: 'ActionRefresh', kebab: 'action-refresh', category: 'action', desc: '刷新', body: '<path d="M4 12a8 8 0 0 1 13.66-5.66L20 8"/><path d="M20 4v4h-4"/><path d="M20 12a8 8 0 0 1-13.66 5.66L4 16"/><path d="M4 20v-4h4"/>' },
  { exportName: 'ActionDownload', kebab: 'action-download', category: 'action', desc: '下载', body: '<path d="M12 4v10"/><path d="M8 10l4 4 4-4"/><path d="M5 19h14"/>' },
  { exportName: 'ActionUpload', kebab: 'action-upload', category: 'action', desc: '上传', body: '<path d="M12 16V6"/><path d="M8 10l4-4 4 4"/><path d="M5 19h14"/>' },
  { exportName: 'ActionShare', kebab: 'action-share', category: 'action', desc: '分享', body: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6"/><path d="M8.2 13.2l7.6 3.6"/>' },
  { exportName: 'ActionCopy', kebab: 'action-copy', category: 'action', desc: '复制', body: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>' },
  { exportName: 'ActionSort', kebab: 'action-sort', category: 'action', desc: '排序', body: '<path d="M7 4v16M7 4L4 7M7 4l3 3"/><path d="M17 20V4M17 20l-3-3M17 20l3-3"/>' },
  { exportName: 'ActionExpand', kebab: 'action-expand', category: 'action', desc: '展开', body: '<path d="M9 6L4 6L4 11"/><path d="M15 6h5v5"/><path d="M9 18H4v-5"/><path d="M15 18h5v-5"/>' },
  { exportName: 'ActionCollapse', kebab: 'action-collapse', category: 'action', desc: '折叠', body: '<path d="M5 11l4-4 4 4"/><path d="M5 17l4-4 4 4"/><path d="M19 13l-4 4-4-4"/><path d="M19 7l-4 4-4-4"/>' },
  { exportName: 'ActionMore', kebab: 'action-more', category: 'action', desc: '更多', body: '<circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/>' },

  /* ============ Navigation 类（8） ============ */
  { exportName: 'NavigationChevronUp', kebab: 'navigation-chevron-up', category: 'navigation', desc: '向上', body: '<path d="M6 15l6-6 6 6"/>' },
  { exportName: 'NavigationChevronDown', kebab: 'navigation-chevron-down', category: 'navigation', desc: '向下', body: '<path d="M6 9l6 6 6-6"/>' },
  { exportName: 'NavigationChevronLeft', kebab: 'navigation-chevron-left', category: 'navigation', desc: '向左', body: '<path d="M15 6l-6 6 6 6"/>' },
  { exportName: 'NavigationChevronRight', kebab: 'navigation-chevron-right', category: 'navigation', desc: '向右', body: '<path d="M9 6l6 6-6 6"/>' },
  { exportName: 'NavigationMenu', kebab: 'navigation-menu', category: 'navigation', desc: '菜单', body: '<path d="M4 7h16M4 12h16M4 17h16"/>' },
  { exportName: 'NavigationClose', kebab: 'navigation-close', category: 'navigation', desc: '关闭', body: X_PATH },
  { exportName: 'NavigationHome', kebab: 'navigation-home', category: 'navigation', desc: '首页', body: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/><path d="M10 20v-5h4v5"/>' },
  { exportName: 'NavigationBack', kebab: 'navigation-back', category: 'navigation', desc: '返回', body: '<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>' },

  /* ============ Status 类（8） ============ */
  { exportName: 'StatusSuccess', kebab: 'status-success', category: 'status', desc: '成功', body: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>' },
  { exportName: 'StatusError', kebab: 'status-error', category: 'status', desc: '错误', body: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><path d="M12 16v.5"/>' },
  { exportName: 'StatusWarning', kebab: 'status-warning', category: 'status', desc: '警告', body: '<path d="M12 3l9 16H3z"/><path d="M12 9v4"/><path d="M12 16v.5"/>' },
  { exportName: 'StatusInfo', kebab: 'status-info', category: 'status', desc: '信息', body: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5v.5"/>' },
  { exportName: 'StatusLoading', kebab: 'status-loading', category: 'status', desc: '加载中', body: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 3v3"/>' },
  { exportName: 'StatusComplete', kebab: 'status-complete', category: 'status', desc: '已完成', body: '<circle cx="12" cy="12" r="9"/><path d="M7 12.5l3.5 3.5L17 9"/>' },
  { exportName: 'StatusPending', kebab: 'status-pending', category: 'status', desc: '待处理', body: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5"/><path d="M12 15v.5"/>' },
  { exportName: 'StatusBlocked', kebab: 'status-blocked', category: 'status', desc: '已阻断', body: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>' },

  /* ============ Content 类（12） ============ */
  { exportName: 'ContentBook', kebab: 'content-book', category: 'content', desc: '书籍', body: '<path d="M4 4h7v16H4z"/><path d="M11 4h7v16h-7z"/><path d="M4 8h7M13 8h7M4 16h7M13 16h7"/>' },
  { exportName: 'ContentChapter', kebab: 'content-chapter', category: 'content', desc: '章节', body: '<rect x="5" y="4" width="14" height="16" rx="1"/><path d="M9 8h6M9 12h6M9 16h3"/>' },
  { exportName: 'ContentAuthor', kebab: 'content-author', category: 'content', desc: '作者', body: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>' },
  { exportName: 'ContentTag', kebab: 'content-tag', category: 'content', desc: '标签', body: '<path d="M4 4h7l9 9-7 7-9-9z"/><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none"/>' },
  { exportName: 'ContentCategory', kebab: 'content-category', category: 'content', desc: '分类', body: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>' },
  { exportName: 'ContentBookmark', kebab: 'content-bookmark', category: 'content', desc: '书签', body: '<path d="M6 4h12v16l-6-4-6 4z"/>' },
  { exportName: 'ContentLibrary', kebab: 'content-library', category: 'content', desc: '书架', body: '<path d="M4 6h16M4 6v14h16V6"/><path d="M9 6v14M14 6v14"/><path d="M2 6V4h20v2"/>' },
  { exportName: 'ContentReading', kebab: 'content-reading', category: 'content', desc: '在读', body: '<path d="M4 6a8 3 0 0 1 16 0v12a8 3 0 0 1-16 0z"/><path d="M4 6a8 3 0 0 0 16 0"/><path d="M4 12a8 3 0 0 0 16 0"/>' },
  { exportName: 'ContentReview', kebab: 'content-review', category: 'content', desc: '评论', body: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>' },
  { exportName: 'ContentRank', kebab: 'content-rank', category: 'content', desc: '榜单', body: '<path d="M5 20h14M7 20V10M12 20V4M17 20v-7"/>' },
  { exportName: 'ContentSubscribe', kebab: 'content-subscribe', category: 'content', desc: '订阅', body: '<path d="M6 4h12v16l-3-2-3 2-3-2-3 2z"/><path d="M9 9h6M9 13h4"/>' },
  { exportName: 'ContentHistory', kebab: 'content-history', category: 'content', desc: '历史', body: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/>' },

  /* ============ Media 类（4） ============ */
  { exportName: 'MediaPlay', kebab: 'media-play', category: 'media', desc: '播放', body: '<path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none"/>' },
  { exportName: 'MediaPause', kebab: 'media-pause', category: 'media', desc: '暂停', body: '<rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/>' },
  { exportName: 'MediaVolume', kebab: 'media-volume', category: 'media', desc: '音量', body: '<path d="M4 9v6h4l5 4V5l-5 4z"/><path d="M16 8a5 5 0 0 1 0 8"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>' },
  { exportName: 'MediaFullscreen', kebab: 'media-fullscreen', category: 'media', desc: '全屏', body: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>' },

  /* ============ Communication 类（5） ============ */
  { exportName: 'CommunicationMessage', kebab: 'communication-message', category: 'communication', desc: '消息', body: '<path d="M4 5h16v11H9l-5 4z"/>' },
  { exportName: 'CommunicationNotification', kebab: 'communication-notification', category: 'communication', desc: '通知', body: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>' },
  { exportName: 'CommunicationMail', kebab: 'communication-mail', category: 'communication', desc: '邮件', body: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>' },
  { exportName: 'CommunicationComment', kebab: 'communication-comment', category: 'communication', desc: '评论', body: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/>' },
  { exportName: 'CommunicationFeedback', kebab: 'communication-feedback', category: 'communication', desc: '反馈', body: '<path d="M4 5h16v12H10l-4 3v-3H4z"/><path d="M8 9h8M8 12h5"/>' },

  /* ============ Editor 类（4） ============ */
  { exportName: 'EditorBold', kebab: 'editor-bold', category: 'editor', desc: '加粗', body: '<path d="M7 4h6a3.5 3.5 0 0 1 0 7H7zM7 11h7a3.5 3.5 0 0 1 0 7H7z"/>' },
  { exportName: 'EditorItalic', kebab: 'editor-italic', category: 'editor', desc: '斜体', body: '<path d="M19 4h-7M12 20H5M15 4l-6 16"/>' },
  { exportName: 'EditorUnderline', kebab: 'editor-underline', category: 'editor', desc: '下划线', body: '<path d="M7 4v6a5 5 0 0 0 10 0V4"/><path d="M5 20h14"/>' },
  { exportName: 'EditorLink', kebab: 'editor-link', category: 'editor', desc: '链接', body: '<path d="M9 15l6-6"/><path d="M8 11a4 4 0 0 1 0-6l2-2a4 4 0 0 1 6 6l-1 1"/><path d="M16 13a4 4 0 0 1 0 6l-2 2a4 4 0 0 1-6-6l1-1"/>' },

  /* ============ System 类（4） ============ */
  { exportName: 'SystemSettings', kebab: 'system-settings', category: 'system', desc: '设置', body: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>' },
  { exportName: 'SystemUser', kebab: 'system-user', category: 'system', desc: '用户', body: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' },
  { exportName: 'SystemLogout', kebab: 'system-logout', category: 'system', desc: '退出', body: '<path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5"/><path d="M10 12H3M3 12l4-4M3 12l4 4"/>' },
  { exportName: 'SystemThemeToggle', kebab: 'system-theme-toggle', category: 'system', desc: '主题切换', body: '<path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/>' },

  /* ============ Novel 阅读类（5） ============ */
  { exportName: 'NovelBookOpen', kebab: 'novel-book-open', category: 'novel', desc: '打开阅读', body: '<path d="M12 6a8 3 0 0 0-8-3v15a8 3 0 0 1 8 3 8 3 0 0 1 8-3V3a8 3 0 0 0-8 3z"/><path d="M12 6v15"/>' },
  { exportName: 'NovelBookClosed', kebab: 'novel-book-closed', category: 'novel', desc: '关闭', body: '<rect x="6" y="3" width="12" height="18" rx="1"/><path d="M9 7h6"/>' },
  { exportName: 'NovelBookmark', kebab: 'novel-bookmark', category: 'novel', desc: '书签（线性）', body: '<path d="M7 4h10v16l-5-3.5L7 20z"/>' },
  { exportName: 'NovelBookmarkFilled', kebab: 'novel-bookmark-filled', category: 'novel', desc: '书签（实心）', body: '<path d="M7 4h10v16l-5-3.5L7 20z" fill="currentColor" stroke="currentColor"/>', filled: true },
  { exportName: 'NovelReadingGlasses', kebab: 'novel-reading-glasses', category: 'novel', desc: '阅读眼镜', body: '<circle cx="7" cy="14" r="3"/><circle cx="17" cy="14" r="3"/><path d="M10 14h4M4 14V9l3-2M20 14V9l-3-2"/>' },

  /* ============ Novel 章节类（4） ============ */
  { exportName: 'NovelChapterList', kebab: 'novel-chapter-list', category: 'novel', desc: '章节目录', body: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/>' },
  { exportName: 'NovelChapterNext', kebab: 'novel-chapter-next', category: 'novel', desc: '下一章', body: '<path d="M5 4l8 8-8 8z"/><path d="M19 4v16"/>' },
  { exportName: 'NovelChapterPrev', kebab: 'novel-chapter-prev', category: 'novel', desc: '上一章', body: '<path d="M19 4l-8 8 8 8z"/><path d="M5 4v16"/>' },
  { exportName: 'NovelChapterLock', kebab: 'novel-chapter-lock', category: 'novel', desc: 'VIP 锁', body: '<rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><path d="M12 15v2"/>' },

  /* ============ Novel 互动类（6） ============ */
  { exportName: 'NovelHeart', kebab: 'novel-heart', category: 'novel', desc: '点赞（线性）', body: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>' },
  { exportName: 'NovelHeartFilled', kebab: 'novel-heart-filled', category: 'novel', desc: '点赞（实心）', body: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill="currentColor" stroke="currentColor"/>', filled: true },
  { exportName: 'NovelThumbsUp', kebab: 'novel-thumbs-up', category: 'novel', desc: '推荐', body: '<path d="M7 10v10H4V10zM7 10l4-6a2 2 0 0 1 2 2v3h6a2 2 0 0 1 2 2l-2 7a2 2 0 0 1-2 1H7"/>' },
  { exportName: 'NovelComment', kebab: 'novel-comment', category: 'novel', desc: '评论', body: '<path d="M4 5h16v11H10l-4 4v-4H4z"/><path d="M8 10h8M8 13h5"/>' },
  { exportName: 'NovelShare', kebab: 'novel-share', category: 'novel', desc: '分享', body: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>' },
  { exportName: 'NovelReward', kebab: 'novel-reward', category: 'novel', desc: '打赏', body: '<circle cx="12" cy="12" r="9"/><path d="M9 10c0-1 1-2 3-2s3 1 3 2-1 1.5-3 1.5-3 .5-3 1.5 1 2 3 2 3-1 3-2"/><path d="M12 6v1M12 17v1"/>' },

  /* ============ Novel 状态类（5） ============ */
  { exportName: 'NovelFire', kebab: 'novel-fire', category: 'novel', desc: '热门', body: '<path d="M12 3s4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5 0 2 1 3 2 3 0-2-2-3-2-5 0-2 3-3.5 3-3.5z"/>' },
  { exportName: 'NovelCrown', kebab: 'novel-crown', category: 'novel', desc: 'VIP', body: '<path d="M4 8l4 4 4-7 4 7 4-4-2 11H6z"/>' },
  { exportName: 'NovelMedal', kebab: 'novel-medal', category: 'novel', desc: '勋章', body: '<circle cx="12" cy="14" r="5"/><path d="M9 9L7 3h10l-2 6M12 12l1 2-1 1-1-1z" fill="currentColor" stroke="none"/>' },
  { exportName: 'NovelTrendingUp', kebab: 'novel-trending-up', category: 'novel', desc: '趋势上升', body: '<path d="M3 17l6-6 4 4 7-7"/><path d="M17 8h4v4"/>' },
  { exportName: 'NovelTrendingDown', kebab: 'novel-trending-down', category: 'novel', desc: '趋势下降', body: '<path d="M3 7l6 6 4-4 7 7"/><path d="M17 16h4v-4"/>' },

  /* ============ Novel 阅读设置类（5） ============ */
  { exportName: 'NovelMoon', kebab: 'novel-moon', category: 'novel', desc: '夜间模式', body: '<path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/>' },
  { exportName: 'NovelSun', kebab: 'novel-sun', category: 'novel', desc: '日间模式', body: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>' },
  { exportName: 'NovelEye', kebab: 'novel-eye', category: 'novel', desc: '护眼模式', body: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>' },
  { exportName: 'NovelTextSize', kebab: 'novel-text-size', category: 'novel', desc: '字号', body: '<path d="M4 18l4-10 4 10M5.5 14h5M14 18l3-8 3 8M15.5 15h3"/>' },
  { exportName: 'NovelLineSpacing', kebab: 'novel-line-spacing', category: 'novel', desc: '行距', body: '<path d="M4 7h16M4 12h16M4 17h16"/><path d="M7 4l-3 3 3 3M17 4l3 3-3 3"/>' },
];
