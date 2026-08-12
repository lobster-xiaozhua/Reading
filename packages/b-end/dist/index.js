/* ============================================================
 * @novel/b-end · B 端专用组件包入口
 * 22 组件 + 数据模型工具，基于 Ant Design 5.x + Atlas Tokens
 *
 * 禁止 import @novel/components 基础组件（详见 04-B端开发计划.md §0.3）
 * ============================================================ */
export const B_END_VERSION = "0.2.0";
/* ---------- 批次 A · 展示与导航型（6 个） ---------- */
export { BPageHeader } from "./page-header/BPageHeader.js";
export { BFilterBar } from "./filter-bar/BFilterBar.js";
export { BStatisticCard } from "./statistic-card/BStatisticCard.js";
export { BSparkline } from "./statistic-card/BSparkline.js";
export { BBatchActionBar } from "./batch-action-bar/BBatchActionBar.js";
export { BBreadcrumb } from "./breadcrumb/BBreadcrumb.js";
export { BResult } from "./result/BResult.js";
/* ---------- 批次 B · 表单与数据型（12 个） ---------- */
export { BTable } from "./table/BTable.js";
export { CompactTable } from "./table/CompactTable.js";
export { BForm } from "./form/BForm.js";
export { BFormItem } from "./form/BFormItem.js";
export { BUpload } from "./upload/BUpload.js";
export { BDatePicker, BRangePicker } from "./date-picker/BDatePicker.js";
export { BSteps } from "./steps/BSteps.js";
export { BCascader } from "./cascader/BCascader.js";
export { BTree } from "./tree/BTree.js";
export { BTreeSelect } from "./tree/BTreeSelect.js";
export { BTransfer } from "./transfer/BTransfer.js";
export { BRate } from "./rate/BRate.js";
export { BProgress } from "./progress/BProgress.js";
export { BDescriptions } from "./descriptions/BDescriptions.js";
export { BTimeline } from "./timeline/BTimeline.js";
/* ---------- 批次 C · 专项组件（4 个） ---------- */
export { ChapterEditor } from "./chapter-editor/ChapterEditor.js";
export { BContentReview } from "./content-review/BContentReview.js";
export { BAuthorManager } from "./author-manager/BAuthorManager.js";
/* ---------- P2-21 · 数据模型工具 ---------- */
export { canTransitionNovel, transitionNovel, nextNovelStatuses, } from "./data-model/novel-status.js";
export { canTransitionChapter, transitionChapter, nextChapterStatuses, } from "./data-model/chapter-status.js";
export { countPureWords, countWithPunctuation, countWords, } from "./data-model/word-count.js";
export { validatePricing, calculateRoyalty, getContractTypeName, } from "./data-model/vip-pricing.js";
/* ---------- P8-1 · 敏感词过滤策略 ---------- */
export { scanText, shouldBlockSave, hasRequireAudit, getFilterAction, splitContentBySensitive, LEVEL_POLICY, SENSITIVE_LEVEL_META, } from "./data-model/sensitive-filter.js";
/* ---------- P8-2 · 稿费管理 ---------- */
export { BRoyaltyDetail, defaultRoyaltyColumns, } from "./royalty/BRoyaltyDetail.js";
export { SettlementFlow, DEFAULT_SETTLEMENT_FLOW, } from "./royalty/SettlementFlow.js";
/* ---------- P7 · 数据可视化（6 基础 + 5 业务） ---------- */
export { BLineChart } from "./charts/BLineChart.js";
export { BColumnChart } from "./charts/BColumnChart.js";
export { BPieChart } from "./charts/BPieChart.js";
export { BAreaChart } from "./charts/BAreaChart.js";
export { BHeatmap } from "./charts/BHeatmap.js";
export { BGauge } from "./charts/BGauge.js";
// 共享工具
export { CHART_DEFAULT_HEIGHT, getChartColors, isDarkMode, ChartWrapper, } from "./charts/shared.js";
// P7-7~11 小说专用图表
export { WordCountGrowthChart } from "./charts/business/WordCountGrowthChart.js";
export { ReadingHeatmap } from "./charts/business/ReadingHeatmap.js";
export { ReadingFunnel } from "./charts/business/ReadingFunnel.js";
export { RankingTrendChart } from "./charts/business/RankingTrendChart.js";
export { CategoryDistributionChart } from "./charts/business/CategoryDistributionChart.js";
//# sourceMappingURL=index.js.map