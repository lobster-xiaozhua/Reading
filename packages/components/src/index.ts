/* ============================================================
 * Atlas Design System · 通用组件入口
 * 用法：import { Button, Input, ... } from '@novel/components'
 * 样式：import '@novel/components/styles.css'
 * ============================================================ */

// P2.1 原子层
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button.js';
export { Input, type InputProps, type InputSize, type InputStatus } from './Input.js';
export { Tag, type TagProps, type TagColor } from './Tag.js';
export { Badge, type BadgeProps } from './Badge.js';
export { Avatar, type AvatarProps, type AvatarSize, type AvatarShape } from './Avatar.js';
export { Switch, type SwitchProps, type SwitchSize } from './Switch.js';
export { Checkbox, type CheckboxProps } from './Checkbox.js';
export { RadioGroup, type RadioGroupProps, type RadioOption } from './Radio.js';

// P2.2 反馈层
export { Tooltip, type TooltipProps } from './Tooltip.js';
export { Popover, type PopoverProps } from './Popover.js';
export { Dropdown, type DropdownProps, type DropdownItem } from './Dropdown.js';
export {
  Alert,
  type AlertProps,
  type AlertType,
  FeedbackProvider,
  useFeedback,
  createMessageApi,
  createNotificationApi,
} from './Alert.js';
export { EmptyState, type EmptyStateProps, Skeleton, type SkeletonProps } from './EmptyState.js';

// P2.3 容器层
export { Modal, type ModalProps } from './Modal.js';
export { Drawer, type DrawerProps, type DrawerPlacement } from './Drawer.js';
export { Tabs, type TabsProps, type TabItem, type TabsType, type TabsSize } from './Tabs.js';
export { Pagination, type PaginationProps } from './Pagination.js';
export { Select, type SelectProps, type SelectOption } from './Select.js';

// P2.4 业务原子层
export { BookMeta, type BookMetaProps } from './BookMeta.js';
export {
  ContentStatus,
  type ContentStatusProps,
  type ContentStatusType,
} from './ContentStatus.js';

// P3 C 端基础组件
export { RatingStars, type RatingStarsProps } from './RatingStars.js';
export {
  BookCard,
  type Book,
  type BookCardProps,
  type BookCardVariant,
  type BookCardSize,
} from './BookCard.js';
export { NotificationBadge, type NotificationBadgeProps } from './NotificationBadge.js';
export {
  ChapterList,
  type Chapter,
  type ChapterListProps,
  type ChapterOrder,
} from './ChapterList.js';
export {
  Bookshelf,
  type BookshelfProps,
  type BookshelfTab,
  type BookshelfGroupBy,
  type BookshelfSortBy,
  type BookshelfViewMode,
} from './Bookshelf.js';

// P4 C 端阅读器
export {
  Reader,
  type ReaderProps,
  type ReaderChapter,
} from './Reader.js';
export {
  ReaderSettings,
  type ReaderSettingsProps,
} from './ReaderSettings.js';
export {
  ReadingProgress,
  type ReadingProgressProps,
} from './ReadingProgress.js';
export {
  useReaderSettings,
  type ReaderSettings as ReaderSettingsValue,
  type ReaderFontSize,
  type ReaderLineHeight,
  type ReaderFontFamily,
  type ReaderTheme,
  type ReaderPageMode,
  DEFAULT_READER_SETTINGS,
  LINE_HEIGHT_VALUE,
  FONT_FAMILY_VAR,
  THEME_VARS,
} from './useReaderSettings.js';
export {
  useReaderCache,
  type CachedChapter,
  type ChapterFetcher,
  type ChapterRef,
  type UseReaderCacheOptions,
  type UseReaderCacheReturn,
} from './useReaderCache.js';

// P6 C 端扩展组件
export { RankingBoard, type RankingBoardProps, type RankItemType } from './RankingBoard.js';
export { TagCloud, type TagCloudProps, type TagCloudTag } from './TagCloud.js';
export { Comment, type CommentProps, type CommentData } from './Comment.js';
export { RewardButton, type RewardButtonProps, type RewardType } from './RewardButton.js';
export { BookRecommend, type BookRecommendProps, type RecommendBookItem } from './BookRecommend.js';

// P2.4 状态模式 Hook
export {
  useAsyncState,
  type AsyncState,
  type AsyncStatus,
  type UseAsyncStateOptions,
  type UseAsyncStateReturn,
} from './useAsyncState.js';

// 工具函数
export { initErrorMonitor } from './utils/error-monitor.js';
