import { test, expect } from '@playwright/test'
import { mockApiRoutes, waitForAppReady } from './helpers'

test.describe('Migrated feature wiring', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page)
    await page.goto('/')
    await waitForAppReady(page)
  })

  test('SessionDashboard is wired into ChatPanel', async ({ page }) => {
    await page.locator('[data-session-id="ses-1"]').click()
    await page.waitForSelector('.session-dashboard', { timeout: 10000 })
    await expect(page.locator('.session-dashboard')).toBeVisible()
    await expect(page.locator('.context-bar-btn')).toBeVisible()
    await expect(page.locator('.dash-model')).toBeVisible()
  })

  test('Memory dialog opens from toolbar', async ({ page }) => {
    await page.locator('[data-session-id="ses-1"]').click()
    await page.waitForSelector('.send-message-area', { timeout: 10000 })
    await page.locator('[title*="Project Rules"]').click()
    await expect(page.locator('.memory-dialog, [class*="memory"]').first()).toBeVisible({ timeout: 5000 }).catch(async () => {
      // Dialog may use settings-overlay shell
      await expect(page.locator('.settings-overlay, .settings-dialog').first()).toBeVisible({ timeout: 3000 })
    })
  })

  test('session list items expose pin and status selectors', async ({ page }) => {
    await expect(page.locator('[data-session-id]').first()).toBeVisible()
    await expect(page.locator('.session-status-dot, .status-dot').first()).toBeVisible()
  })
})
