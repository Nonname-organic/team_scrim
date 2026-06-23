import { test, expect } from '@playwright/test'
import { login, logout, EMAIL, PASSWORD } from './helpers'

// ────────────────────────────────────────────────────────────────
// 認証フロー (13 ケース)
// ────────────────────────────────────────────────────────────────

test.describe('認証 — 正常系', () => {
  test('TC-A01: 正しい認証情報でログインできる', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL('/')
  })

  test('TC-A02: ログイン後にダッシュボードが表示される', async ({ page }) => {
    await login(page)
    await expect(page.locator('text=ダッシュボード')).toBeVisible()
  })

  test('TC-A03: ログアウトで /login にリダイレクトされる', async ({ page }) => {
    await login(page)
    await logout(page)
    await expect(page).toHaveURL('/login')
  })

  test('TC-A04: ログアウト後に / へアクセスすると /login にリダイレクト', async ({ page }) => {
    await login(page)
    await logout(page)
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })

  test('TC-A05: ログイン済みで /login を開くと / にリダイレクト', async ({ page }) => {
    await login(page)
    await page.goto('/login')
    await expect(page).toHaveURL('/')
  })
})

test.describe('認証 — 異常系', () => {
  test('TC-A06: 誤パスワードでエラーメッセージが表示される', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]',    EMAIL)
    await page.fill('input[type="password"]', 'wrongpassword123')
    await page.click('button[type="submit"]')
    await expect(page.locator('[class*="FF4655"]').first()).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('TC-A07: メールアドレス空欄ではフォームが送信されない', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/login')
  })

  test('TC-A08: パスワード空欄ではフォームが送信されない', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', EMAIL)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/login')
  })

  test('TC-A09: 未ログインで /players にアクセスすると /login にリダイレクト', async ({ page }) => {
    await page.goto('/players')
    await expect(page).toHaveURL('/login')
  })

  test('TC-A10: 未ログインで /round-analysis にアクセスすると /login にリダイレクト', async ({ page }) => {
    await page.goto('/round-analysis')
    await expect(page).toHaveURL('/login')
  })

  test('TC-A11: 未ログインで /scrim-input にアクセスすると /login にリダイレクト', async ({ page }) => {
    await page.goto('/scrim-input')
    await expect(page).toHaveURL('/login')
  })

  test('TC-A12: 未ログインで /settings にアクセスすると /login にリダイレクト', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL('/login')
  })

  test('TC-A13: /reset-password は未ログインでもアクセスできる', async ({ page }) => {
    await page.goto('/reset-password')
    // /login にリダイレクトされない
    await expect(page).not.toHaveURL('/login')
  })
})
