/** 内容分级标识（用于 VIP/限免/编辑推荐/热门） */
export type BookFlag = "vip" | "free-limited" | "editor-pick" | "hot";
/** 书籍分类（站内统一分类树） */
export type BookCategory = "xuanhuan" | "xianxia" | "urban" | "history" | "scifi" | "wuxia" | "game" | "suspense" | "romance" | "other";
/** 付款/签约模式（B 端稿费用） */
export type ContractType = "buyout" | "share" | "guarantee-share";
/** 结算状态流转 */
export type SettlementStatus = "pending" | "settled" | "withdrawn";
/** 审核级别 */
export type AuditLevel = "first" | "second" | "final";
/** 审核结果 */
export type AuditResult = "approve" | "revise" | "reject";
/** 驳回原因分类 */
export type RejectReason = "political" | "pornographic" | "violence" | "plagiarism" | "advertisement" | "other";
/** 下架原因分类 */
export type OfflineReason = "violation" | "copyright" | "author-request" | "operation-adjust";
