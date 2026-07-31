/* ============================================================
 * @novel/b-end · B 端专用组件包入口
 * 22 组件 + 数据模型工具，基于 Ant Design 5.x + Atlas Tokens
 *
 * 禁止 import @novel/components 基础组件（详见 04-B端开发计划.md §0.3）
 * ============================================================ */

export const B_END_VERSION = '0.2.0';

/* ---------- 批次 A · 展示与导航型（6 个） ---------- */
export { BPageHeader } from './page-header/BPageHeader.js';
export type { BPageHeaderProps } from './page-header/BPageHeader.js';

export { BFilterBar } from './filter-bar/BFilterBar.js';
export type { BFilterBarProps, FilterField } from './filter-bar/BFilterBar.js';

export { BStatisticCard } from './statistic-card/BStatisticCard.js';
export type { BStatisticCardProps, StatisticTrend } from './statistic-card/BStatisticCard.js';

export { BBatchActionBar } from './batch-action-bar/BBatchActionBar.js';
export type { BBatchActionBarProps, BatchAction } from './batch-action-bar/BBatchActionBar.js';

export { BBreadcrumb } from './breadcrumb/BBreadcrumb.js';
export type { BBreadcrumbProps, BBreadcrumbItem } from './breadcrumb/BBreadcrumb.js';

export { BResult } from './result/BResult.js';
export type { BResultProps, BResultStatus } from './result/BResult.js';

/* ---------- 批次 B · 表单与数据型（12 个） ---------- */
export { BTable } from './table/BTable.js';
export type { BTableProps } from './table/BTable.js';

export { BForm } from './form/BForm.js';
export { BFormItem } from './form/BFormItem.js';
export type { BFormProps } from './form/BForm.js';
export type { BFormItemProps } from './form/BFormItem.js';

export { BUpload } from './upload/BUpload.js';
export type { BUploadProps } from './upload/BUpload.js';

export { BDatePicker, BRangePicker } from './date-picker/BDatePicker.js';
export type { BDatePickerProps, BRangePickerProps } from './date-picker/BDatePicker.js';

export { BSteps } from './steps/BSteps.js';
export type { BStepsProps } from './steps/BSteps.js';

export { BCascader } from './cascader/BCascader.js';
export type { BCascaderProps } from './cascader/BCascader.js';

export { BTree } from './tree/BTree.js';
export { BTreeSelect } from './tree/BTreeSelect.js';
export { BTransfer } from './transfer/BTransfer.js';
export type { BTransferProps } from './transfer/BTransfer.js';

export { BRate } from './rate/BRate.js';
export { BProgress } from './progress/BProgress.js';

export { BDescriptions } from './descriptions/BDescriptions.js';
export type { BDescriptionsProps } from './descriptions/BDescriptions.js';

export { BTimeline } from './timeline/BTimeline.js';

/* ---------- 批次 C · 专项组件（4 个） ---------- */
export { ChapterEditor } from './chapter-editor/ChapterEditor.js';

export { BContentReview } from './content-review/BContentReview.js';
export type { BContentReviewProps, ReviewItem, ReviewHistoryEntry } from './content-review/BContentReview.js';

export { BAuthorManager } from './author-manager/BAuthorManager.js';
export type {
  BAuthorManagerProps,
  AuthorInfo,
  AuthorWork,
  ContractInfo,
  RoyaltyStat,
} from './author-manager/BAuthorManager.js';

/* ---------- P2-21 · 数据模型工具 ---------- */
export {
  canTransitionNovel,
  transitionNovel,
  nextNovelStatuses,
} from './data-model/novel-status.js';

export {
  canTransitionChapter,
  transitionChapter,
  nextChapterStatuses,
} from './data-model/chapter-status.js';

export {
  countPureWords,
  countWithPunctuation,
  countWords,
} from './data-model/word-count.js';

export {
  validatePricing,
  calculateRoyalty,
  getContractTypeName,
} from './data-model/vip-pricing.js';
export type {
  PricingParams,
  PricingResult,
  BuyoutParams,
  ShareParams,
  GuaranteeShareParams,
} from './data-model/vip-pricing.js';
