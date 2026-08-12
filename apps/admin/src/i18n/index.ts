/* ============================================================
 * P0-15 · i18n 配置
 * - react-i18next + V1.0 仅中文
 * - 命名空间：common / menu / novel / chapter / audit / royalty / permission / error
 * - 后续扩展：V1.1 不实现 en-US，但 i18next 配置已支持懒加载
 * ============================================================ */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zhCN from "./locales/zh-CN";

i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": zhCN,
  },
  lng: "zh-CN",
  fallbackLng: "zh-CN",
  defaultNS: "common",
  ns: [
    "common",
    "menu",
    "layout",
    "workbench",
    "novel",
    "novelDetail",
    "novelForm",
    "chapter",
    "audit",
    "charts",
    "royalty",
    "permission",
    "user",
    "system",
    "login",
    "error",
  ],
  interpolation: {
    escapeValue: false,
    prefix: "{",
    suffix: "}",
  },
});

export default i18n;
