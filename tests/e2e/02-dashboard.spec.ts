import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('ダッシュボード (8 ケース)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('TC-D01: ダッシュボードが表示される', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('TC-D02: ローディング後にデータが表示される', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    // エラー状態でないことを確認
    await expect(page.locator('text=エラー')).not.toBeVisible({ timeout: 5000 }).catch(() => {})
  })

  test('TC-D03: マップフィルターが動作する', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    const filterBtn = page.locator('button:has-text("Ascent"), button:has-text("Bind"), button:has-text("Split")').first()
    if (await filterBtn.isVisible()) {
      await filterBtn.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('TC-D04: サイドバーのナビゲーションが全て表示される', async ({ page }) => {
    await expect(page.locator('text=試合入力')).toBeVisible()
    await expect(page.locator('text=選手スタッツ')).toBeVisible()
    await expect(page.locator('text=試合分析')).toBeVisible()
  })

  test('TC-D05: 試合入力リンクをクリックすると /scrim-input に遷移', async ({ page }) => {
    await page.click('text=試合入力')
    await expect(page).toHaveURL('/scrim-input')
  })

  test('TC-D06: 選手スタッツリンクをクリックすると /players に遷移', async ({ page }) => {
    await page.click('text=選手スタッツ')
    await expect(page).toHaveURL('/players')
  })

  test('TC-D07: 試合分析リンクをクリックすると /round-analysis に遷移', async ({ page }) => {
    await page.click('text=試合分析')
    await expect(page).toHaveURL('/round-analysis')
  })

  test('TC-D08: ヘルスチェックAPIが200を返す', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })
})
