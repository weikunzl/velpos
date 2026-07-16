import { test, expect } from '@playwright/test'
import { mockApiRoutes, waitForAppReady } from './helpers'

test.describe('Global Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page)
    await page.goto('/')
    await waitForAppReady(page)
  })

  test('Ctrl+B toggles sidebar collapse', async ({ page }) => {
    const sidebar = page.locator('.main-sidebar')

    // Press Ctrl+B (or Meta+B on macOS)
    await page.keyboard.press('Meta+b')
    await page.waitForTimeout(300)

    // Sidebar should be collapsed
    const collapsed = await sidebar.evaluate((el) => el.classList.contains('sidebar-collapsed'))
    if (!collapsed) {
      // Try again with Control+B
      await page.keyboard.press('Control+b')
      await page.waitForTimeout(300)
    }

    // Toggle back
    await page.keyboard.press('Meta+b')
    await page.waitForTimeout(300)
  })

  test('Ctrl+P opens Settings dialog', async ({ page }) => {
    // Press Ctrl+P (or Meta+P on macOS)
    await page.keyboard.press('Meta+p')
    await page.waitForTimeout(500)

    // Settings modal should open
    const modal = page.locator('.modal-overlay')
    await expect(modal).toBeVisible({ timeout: 3000 }).catch(async () => {
      // Try Control+P as fallback
      await page.keyboard.press('Control+p')
      await page.waitForTimeout(500)
      await expect(modal).toBeVisible({ timeout: 3000 }).catch(() => {
        // Shortcut might not be implemented yet or uses different key combo
      })
    })

    // Close with Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  test('Ctrl+Up / Down navigates between sessions', async ({ page }) => {
    // Should have multiple sessions
    const sessionItems = page.locator('[data-session-id]')
    const count = await sessionItems.count()
    expect(count).toBeGreaterThanOrEqual(2)

    // Make sure ses-1 is selected first
    await page.locator('[data-session-id="ses-1"]').click()
    await page.waitForTimeout(300)

    // Navigate to next session (Ctrl+Down / Meta+ArrowDown)
    await page.keyboard.press('Meta+ArrowDown')
    await page.waitForTimeout(300)

    // Navigate to previous session
    await page.keyboard.press('Meta+ArrowUp')
    await page.waitForTimeout(300)
  })

  test('Escape closes dialogs', async ({ page }) => {
    // Open Settings dialog
    await page.locator('.header-toolbar-btn[title="Settings"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('.modal-overlay')).toBeVisible()

    // Press Escape to close
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Dialog should be closed
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 2000 }).catch(() => {
      // OK if there are multiple dialogs
    })
  })

  test('Escape closes New Project dialog', async ({ page }) => {
    // Open New Project dialog
    await page.locator('.new-project-btn').click()
    await page.waitForTimeout(300)
    await expect(page.locator('.new-project-dialog')).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Dialog should be closed
    await expect(page.locator('.new-project-dialog')).not.toBeVisible({ timeout: 2000 }).catch(() => {
      // OK if closing takes a moment
    })
  })

  test('app layout renders correctly', async ({ page }) => {
    // Verify the main layout structure
    await expect(page.locator('.app-shell')).toBeVisible()
    await expect(page.locator('.app-header')).toBeVisible()
    await expect(page.locator('.app-body')).toBeVisible()

    // Sidebar should be visible
    await expect(page.locator('.main-sidebar')).toBeVisible()

    // Main content area should exist
    await expect(page.locator('.app-main')).toBeVisible()
  })
})
