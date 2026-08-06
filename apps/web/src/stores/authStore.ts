/* ============================================================
 * 兼容层：authStore 重定向到 atlasStore
 * 保持 http.ts 等外部引用的向后兼容
 * ============================================================ */
export { useAtlasStore as useAuthStore, isTokenExpired, isTokenNearExpiry } from "./atlasStore";
export type { ReaderUser } from "./atlasStore";