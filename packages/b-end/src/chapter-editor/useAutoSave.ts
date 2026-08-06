/* ============================================================
 * P2-19-e · 自动保存 Hook
 * 导出 useAutoSave(editor, { onSave, interval })
 * - useEditor onUpdate → 节流 interval（默认 30s）→ 调用 onSave
 * - beforeunload 提示未保存
 * - 返回 { status, lastSavedAt }
 * Source: 04-B端开发计划.md P2-19-e
 * ============================================================ */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";

/** 自动保存状态 */
export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

/** useAutoSave 配置 */
export interface UseAutoSaveOptions {
  /** 保存回调，返回 Promise；失败则置 error 状态 */
  onSave: (html: string) => void | Promise<void>;
  /** 节流间隔（ms），默认 30000（30s） */
  interval?: number;
}

/** useAutoSave 返回值 */
export interface UseAutoSaveResult {
  /** 当前保存状态 */
  status: AutoSaveStatus;
  /** 上次保存成功时间戳（ms），null 表示从未保存 */
  lastSavedAt: number | null;
  /** 手动触发保存（绕过节流） */
  saveNow: () => Promise<void>;
}

/**
 * 章节自动保存 Hook。
 *
 * - 监听 editor 的 onUpdate，标记内容已变更
 * - 节流：距离上次保存不足 interval 不重复保存
 * - beforeunload：存在未保存内容时弹出浏览器离开确认
 *
 * @example
 * const autoSave = useAutoSave(editor, { onSave: async (html) => api.save(html) });
 */
export function useAutoSave(
  editor: Editor | null,
  options: UseAutoSaveOptions,
): UseAutoSaveResult {
  const { onSave, interval = 30000 } = options;

  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // 是否有未保存的变更
  const dirtyRef = useRef(false);
  // 节流定时器
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 防止并发保存
  const savingRef = useRef(false);
  // 最新 onSave 引用，避免 effect 频繁重建
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  /** 执行保存 */
  const doSave = useCallback(async () => {
    if (!editor || savingRef.current) return;
    if (!dirtyRef.current) return;

    savingRef.current = true;
    setStatus("saving");
    try {
      const html = editor.getHTML();
      await onSaveRef.current(html);
      dirtyRef.current = false;
      setLastSavedAt(Date.now());
      setStatus("saved");
    } catch {
      setStatus("error");
      // 保留 dirty，下次重试
    } finally {
      savingRef.current = false;
    }
  }, [editor]);

  /** 手动立即保存 */
  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await doSave();
  }, [doSave]);

  // 监听 editor onUpdate：标记 dirty + 重置节流定时器
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      dirtyRef.current = true;
      setStatus((prev) => (prev === "saved" ? "idle" : prev));

      // 节流：清掉旧定时器，重新计时
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        void doSave();
      }, interval);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, interval, doSave]);

  // beforeunload：有未保存内容时提示
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        // 浏览器规范：需设置 returnValue 触发原生确认
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // 卸载时清理定时器；不自动保存（由调用方决定）
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { status, lastSavedAt, saveNow };
}
