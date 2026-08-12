import { test, expect } from "@playwright/test";

test("CommandPalette: Ctrl+K opens, filters, navigates", async ({ page }) => {
  await page.goto("/login");
  const user = page.getByPlaceholder("请输入用户名");
  await user.waitFor({ state: "visible" });
  await user.fill("admin");
  await page.getByPlaceholder("请输入密码").fill("admin123");
  await page.getByRole("button", { name: /登\s*录/ }).click();
  await page.waitForURL(/\/workbench/, { timeout: 15000 });
  await expect(page).toHaveURL(/\/workbench/);
  // 等快捷键监听器绑定
  await expect(page.locator(".bend-header__palette")).toBeVisible();
  await page.waitForTimeout(800);

  // Ctrl+K 打开命令面板
  await page.keyboard.press("Control+K");
  const panel = page.locator(".cmd-palette");
  await expect(panel).toBeVisible();

  // 搜索 "审核"
  await page.keyboard.type("审核");
  const auditItem = page.locator(".cmd-palette__item", { hasText: "内容审核" }).first();
  await expect(auditItem).toBeVisible();

  // 执行跳转
  await auditItem.click();
  await page.waitForURL(/\/audit/, { timeout: 15000 });
  await expect(page).toHaveURL(/\/audit/);

  // 头部搜索触发器
  await page.goto("/workbench");
  const trigger = page.locator(".bend-header__palette");
  await expect(trigger).toBeVisible();
  await expect(trigger).toContainText("Ctrl K");
});

test("CommandPalette: '/' hotkey opens and Esc closes", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("请输入用户名").fill("admin");
  await page.getByPlaceholder("请输入密码").fill("admin123");
  await page.getByRole("button", { name: /登\s*录/ }).click();
  await page.waitForURL(/\/workbench/, { timeout: 15000 });
  await expect(page.locator(".bend-header__palette")).toBeVisible();
  await page.waitForTimeout(800);

  await page.keyboard.press("/");
  await expect(page.locator(".cmd-palette")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator(".cmd-palette")).toBeHidden();
});
