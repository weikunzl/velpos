import { test, expect } from '@playwright/test'
import { mockApiRoutes, MOCK_SESSIONS } from './helpers'

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page)
    await page.goto('/')
    await page.waitForSelector('aside', { timeout: 15000 })
  })

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear())
  })

  test('侧栏加载了会话列表', async ({ page }) => {
    await page.waitForTimeout(2000)
    const sessionItems = page.locator('[data-session-id]')
    const count = await sessionItems.count()
    expect(count).toBeGreaterThan(0)
  })

  test('点击会话可选中', async ({ page }) => {
    await page.waitForTimeout(2000)
    const sessionItem = page.locator('[data-session-id]').first()
    await expect(sessionItem).toBeVisible()
    await sessionItem.click()
    await page.waitForTimeout(500)
    // 会话高亮
    await expect(sessionItem).toHaveClass(/session-item-active/)
  })

  test('侧栏标题显示 Sessions 和数量', async ({ page }) => {
    await page.waitForTimeout(2000)
    await expect(page.locator('.sidebar-title')).toHaveText('Sessions')
    const count = page.locator('.sidebar-count')
    const num = parseInt(await count.textContent() || '0')
    expect(num).toBeGreaterThan(0)
  })

  test('新建会话按钮存在', async ({ page }) => {
    await page.waitForTimeout(2000)
    const newBtn = page.locator('.sidebar-header-btn[title="New session"]')
    await expect(newBtn).toBeVisible()
  })

  test('侧栏会话可进行重命名、复制、删除操作', async ({ page }) => {
    await page.waitForTimeout(2000)
    const firstItem = page.locator('[data-session-id]').first()
    await firstItem.hover()
    // 操作按钮在 hover 时显示
    const renameBtn = page.locator('[title="Rename"]').first()
    const copyBtn = page.locator('[title="Copy"]').first()
    const deleteBtn = page.locator('[title="Delete"]').first()
    await expect(renameBtn).toBeVisible()
    await expect(copyBtn).toBeVisible()
    await expect(deleteBtn).toBeVisible()
  })

  test('多选模式可启用', async ({ page }) => {
    await page.waitForTimeout(2000)
    const selectBtn = page.locator('.sidebar-header-btn[title="Select multiple"]')
    await expect(selectBtn).toBeVisible()
    await selectBtn.click()
    await page.waitForTimeout(300)
    // 多选模式下显示 checkbox
    const batchBar = page.locator('.sidebar-batch-bar')
    await expect(batchBar).toBeVisible()
  })

  test('无会话时显示空状态', async ({ page }) => {
    // 这个功能暂时不做端到端测试，因为需要操作API
  })
})
