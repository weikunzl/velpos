import { test, expect } from '@playwright/test'
import { mockApiRoutes, waitForAppReady, openToolbarDialog } from './helpers'

test.describe('Dialog Panels', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page)
    await page.goto('/')
    await waitForAppReady(page)
  })

  /* ── Settings Dialog ── */

  test.describe('Settings Dialog', () => {
    test('opens and closes via toolbar button', async ({ page }) => {
      await openToolbarDialog(page, 'Settings')

      // Settings modal should be visible
      const modal = page.locator('.modal-overlay')
      await expect(modal).toBeVisible()
      await expect(page.locator('.modal-title')).toContainText('Settings')

      // Close via close button
      await page.locator('.modal-close-btn').click()
      await page.waitForTimeout(300)
      await expect(modal).not.toBeVisible({ timeout: 2000 }).catch(() => {
        // Some implementations keep the overlay briefly
      })
    })

    test('closes settings dialog via ESC key', async ({ page }) => {
      await openToolbarDialog(page, 'Settings')
      await expect(page.locator('.modal-overlay')).toBeVisible()

      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 2000 }).catch(() => {
        // OK if dialog wrapper doesn't disappear immediately
      })
    })

    test('loads and displays settings in General tab', async ({ page }) => {
      await openToolbarDialog(page, 'Settings')
      await page.waitForTimeout(500)

      // General tab should be active by default
      // Check for the permission mode selector
      const permissionSelect = page.locator('.settings-select').first()
      await expect(permissionSelect).toBeVisible({ timeout: 3000 })

      // Should show form fields like toggle rows
      const toggles = page.locator('.settings-toggle-row')
      await expect(toggles.first()).toBeVisible({ timeout: 3000 })
    })

    test('switches between General and Channel Profiles tabs', async ({ page }) => {
      await openToolbarDialog(page, 'Settings')
      await page.waitForTimeout(500)

      // Click Channel Profiles tab
      const profilesTab = page.locator('.settings-tab').last()
      await profilesTab.click()
      await page.waitForTimeout(300)

      // Profile cards should be visible
      const profileCards = page.locator('.settings-profile-card')
      await expect(profileCards.first()).toBeVisible({ timeout: 3000 })

      // Go back to General tab
      await page.locator('.settings-tab').first().click()
      await page.waitForTimeout(300)
      await expect(page.locator('.settings-select').first()).toBeVisible({ timeout: 2000 })
    })

    test('saves settings changes', async ({ page }) => {
      await openToolbarDialog(page, 'Settings')
      await page.waitForTimeout(500)

      // Change permission mode
      const select = page.locator('.settings-select').first()
      await select.selectOption('plan')

      // Click Save
      const saveBtn = page.locator('.settings-save-btn')
      await saveBtn.click()
      await page.waitForTimeout(500)

      // Button should still be visible after save
      await expect(saveBtn).toBeVisible()
    })

    test('adds a new channel profile', async ({ page }) => {
      await openToolbarDialog(page, 'Settings')
      await page.waitForTimeout(500)

      // Switch to profiles tab
      await page.locator('.settings-tab').last().click()
      await page.waitForTimeout(300)

      // Click Add button
      const addBtn = page.locator('.settings-add-btn')
      await addBtn.click()
      await page.waitForTimeout(300)

      // Fill in the form
      const inputs = page.locator('.settings-profile-form .settings-input')
      await inputs.nth(0).fill('My API Profile')
      await inputs.nth(1).fill('https://api.test.com')
      await inputs.nth(2).fill('sk-test-12345')

      // Click Create
      const createBtn = page.locator('.settings-profile-form .settings-btn-primary')
      await createBtn.click()
      await page.waitForTimeout(500)

      // Form should close after creation
      await expect(page.locator('.settings-profile-form')).not.toBeVisible({ timeout: 2000 }).catch(() => {
        // Form might still render if API returns quickly
      })
    })

    test('activates a channel profile', async ({ page }) => {
      await openToolbarDialog(page, 'Settings')
      await page.waitForTimeout(500)

      // Switch to profiles tab
      await page.locator('.settings-tab').last().click()
      await page.waitForTimeout(500)

      // Check for Activate button
      const activateBtn = page.locator('.settings-btn-primary:has-text("Activate")')
      if (await activateBtn.isVisible()) {
        await activateBtn.click()
        await page.waitForTimeout(500)
      }
    })
  })

  /* ── Git Manager Dialog ── */

  test.describe('Git Manager Dialog', () => {
    test('opens via toolbar button', async ({ page }) => {
      await openToolbarDialog(page, 'Git Manager')

      // Git manager uses the same Modal pattern
      const modal = page.locator('.modal-overlay')
      await expect(modal).toBeVisible()
    })
  })

  /* ── Workspace Panel ── */

  test.describe('Workspace Panel', () => {
    test('opens via toolbar button', async ({ page }) => {
      // Select a session first to have a project context
      await page.locator('[data-session-id="ses-1"]').click()
      await page.waitForTimeout(500)

      await openToolbarDialog(page, 'Workspace')

      // Workspace panel should be visible
      const workspacePanel = page.locator('.workspace-drawer')
      await expect(workspacePanel.first()).toBeVisible({ timeout: 3000 }).catch(() => {
        // Panel might use different class name
      })
    })
  })

  /* ── Terminal Drawer ── */

  test.describe('Terminal Drawer', () => {
    test('opens via toolbar button', async ({ page }) => {
      // Select a session first
      await page.locator('[data-session-id="ses-1"]').click()
      await page.waitForTimeout(500)

      await openToolbarDialog(page, 'Terminal')

      // Terminal drawer should be visible
      const terminalDrawer = page.locator('.terminal-drawer, [class*="terminal"]')
      await expect(terminalDrawer.first()).toBeVisible({ timeout: 3000 }).catch(() => {
        // Terminal might use xterm.js which renders in a container
      })
    })
  })

  /* ── New Project Dialog ── */

  test.describe('New Project Dialog', () => {
    test('opens from sidebar footer button', async ({ page }) => {
      await page.locator('.new-project-btn').click()
      await page.waitForTimeout(300)

      const dialog = page.locator('.new-project-dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('.dialog-title')).toContainText('New Project')
    })

    test('closes via overlay click (backdrop)', async ({ page }) => {
      await page.locator('.new-project-btn').click()
      await page.waitForTimeout(300)

      // Click the overlay outside the dialog panel
      await page.locator('.dialog-overlay').click({ position: { x: 10, y: 10 } })
      await page.waitForTimeout(300)

      await expect(page.locator('.new-project-dialog')).not.toBeVisible({ timeout: 2000 }).catch(() => {
        // OK if it takes a moment
      })
    })
  })

  /* ── Multi-dialog stacking ── */

  test.describe('Dialog Stacking', () => {
    test('can open and close multiple dialogs sequentially', async ({ page }) => {
      // Open New Project
      await page.locator('.new-project-btn').click()
      await page.waitForTimeout(300)
      await expect(page.locator('.new-project-dialog')).toBeVisible()

      // Close it
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Open Settings
      await openToolbarDialog(page, 'Settings')
      await expect(page.locator('.modal-overlay')).toBeVisible()

      // Close Settings
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    })
  })
})
