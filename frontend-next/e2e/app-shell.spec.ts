import { test, expect } from '@playwright/test'

test.describe('App Shell', () => {
  test('页面完整加载并显示 Velpos 标题', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Velpos', { exact: true }).first()).toBeVisible({ timeout: 20000 })
  })

  test('HeaderToolbar 包含所有工具栏按钮', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-header', { timeout: 15000 })

    await expect(page.locator('[title="Notifications"]')).toBeVisible()
    await expect(page.locator('[title="Working Sessions"]')).toBeVisible()
    await expect(page.locator('[title="Git Manager"]')).toBeVisible()
    await expect(page.locator('[title="Settings"]')).toBeVisible()
    await expect(page.locator('[title="Workspace files"]')).toBeVisible()
    await expect(page.locator('[title="Terminal"]')).toBeVisible()
  })

  test('侧栏存在', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('aside', { timeout: 15000 })
    await expect(page.locator('aside')).toBeVisible()
  })

  test('Header 不包含 Evolution；Memory 在会话工具栏中可用', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-header', { timeout: 15000 })
    await expect(page.locator('.app-header [title="Evolution"]')).toHaveCount(0)

    // Select a session so ChatToolbar (with MemoryButton) mounts
    const sessionItem = page.locator('[data-session-id]').first()
    if (await sessionItem.count()) {
      await sessionItem.click()
    await page.waitForSelector('.input-section, .input-area', { timeout: 10000 })
      await expect(
        page.locator('[title*="Project Rules"], [title*="Memory"]').first(),
      ).toBeVisible()
    }
  })

  test('页面没有未捕获的运行时错误', async ({ page }) => {
    const errorLogs: string[] = []
    page.on('pageerror', (err) => errorLogs.push(err.message))
    await page.goto('/')
    await page.waitForSelector('.app-shell', { timeout: 15000 })
    await page.waitForTimeout(2000)
    const runtimeErrors = errorLogs.filter(
      (msg) => !msg.includes('manifest.json') && !msg.includes('favicon.svg'),
    )
    expect(runtimeErrors).toEqual([])
  })

  test('主题切换器存在', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-header', { timeout: 15000 })
    await expect(page.locator('.theme-switcher, [class*="theme"]').first()).toBeVisible()
  })
})
