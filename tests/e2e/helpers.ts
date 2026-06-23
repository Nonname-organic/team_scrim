import { Page } from '@playwright/test'

export const EMAIL    = process.env.TEST_EMAIL    || 'axelia.esports@gmail.com'
export const PASSWORD = process.env.TEST_PASSWORD || 'Kr4PvqRkwQ88'

export async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]',    EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('/', { timeout: 15000 })
}

export async function logout(page: Page) {
  await page.click('button:has-text("ログアウト")')
  await page.waitForURL('/login')
}
