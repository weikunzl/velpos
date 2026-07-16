import { test, expect } from '@playwright/test'
import { mockApiRoutes, waitForAppReady } from './helpers'

test.describe('Missing Features Verification', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page)
    await page.goto('/')
    await waitForAppReady(page)
  })

  test('Evolution dialog is not mounted until opened', async ({ page }) => {
    await expect(page.locator('.evolution-dialog, [class*="evolution-dialog"]')).toHaveCount(0)
  })

  test('Memory dialog is not mounted until opened', async ({ page }) => {
    await expect(page.locator('.memory-dialog, [class*="memory-dialog"]')).toHaveCount(0)
  })

  test('IM dialog is not mounted until opened', async ({ page }) => {
    await expect(page.locator('.im-dialog, [class*="im-dialog"]')).toHaveCount(0)
  })

  test('SessionDashboard is wired into ChatPanel', async ({ page }) => {
    await page.locator('[data-session-id="ses-1"]').click()
    await page.waitForSelector('.session-dashboard', { timeout: 10000 })
    await expect(page.locator('.session-dashboard')).toBeVisible()
    await expect(page.locator('.context-bar-btn')).toBeVisible()
    await expect(page.locator('.dash-model')).toBeVisible()
  })
})
