/* ============================================================
 * Atlas Design System · 通用组件入口
 * 用法：import { Button, Input, ... } from '@novel/components'
 * 样式：import '@novel/components/styles.css'
 * ============================================================ */
// P2.1 原子层
export { Button, } from "./Button.js";
export { Input, } from "./Input.js";
export { Tag } from "./Tag.js";
export { Badge } from "./Badge.js";
export { Avatar, } from "./Avatar.js";
export { Switch } from "./Switch.js";
export { Checkbox } from "./Checkbox.js";
export { RadioGroup } from "./Radio.js";
// P2.2 反馈层
export { Tooltip } from "./Tooltip.js";
export { Popover } from "./Popover.js";
export { Dropdown } from "./Dropdown.js";
export { Alert, FeedbackProvider, useFeedback, createMessageApi, createNotificationApi, } from "./Alert.js";
export { EmptyState, Skeleton, } from "./EmptyState.js";
// P2.3 容器层
export { Modal } from "./Modal.js";
export { Drawer } from "./Drawer.js";
export { Tabs, } from "./Tabs.js";
export { Pagination } from "./Pagination.js";
export { Select } from "./Select.js";
// P2.4 业务原子层
export { BookMeta } from "./BookMeta.js";
export { ContentStatus, } from "./ContentStatus.js";
// P3 C 端基础组件
export { RatingStars } from "./RatingStars.js";
export { BookCard, } from "./BookCard.js";
export { NotificationBadge, } from "./NotificationBadge.js";
export { ChapterList, } from "./ChapterList.js";
export { Bookshelf, } from "./Bookshelf.js";
// P4 C 端阅读器
export { Reader } from "./Reader.js";
export { ReaderSettings } from "./ReaderSettings.js";
export { ReadingProgress, } from "./ReadingProgress.js";
export { useReaderSettings, DEFAULT_READER_SETTINGS, LINE_HEIGHT_VALUE, FONT_FAMILY_VAR, THEME_VARS, } from "./useReaderSettings.js";
export { useReaderCache, } from "./useReaderCache.js";
// P6 C 端扩展组件
export { RankingBoard, } from "./RankingBoard.js";
export { TagCloud } from "./TagCloud.js";
export { Comment } from "./Comment.js";
export { RewardButton, } from "./RewardButton.js";
export { BookRecommend, } from "./BookRecommend.js";
export { StatCard } from "./StatCard.js";
// P2.4 状态模式 Hook
export { useAsyncState, } from "./useAsyncState.js";
// 工具函数
export { initErrorMonitor } from "./utils/error-monitor.js";
//# sourceMappingURL=index.js.map