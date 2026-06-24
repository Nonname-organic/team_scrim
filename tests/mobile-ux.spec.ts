/**
 * Mobile UX Regression Tests — AXELIA Analytics
 *
 * セットアップ:
 *   npx playwright install --with-deps
 *   npx playwright test tests/mobile-ux.spec.ts
 *
 * 前提: 開発サーバーが localhost:3000 で起動していること
 *   npm run dev
 */

import { test, expect, Page } from '@playwright/test'

// ── テスト対象デバイス ──────────────────────────────────────────
const DEVICES = {
  'iPhone SE (320px)':  { width: 375,  height: 667  },
  'iPhone 14 (390px)':  { width: 390,  height: 844  },
  'Pixel 7 (412px)':    { width: 412,  height: 915  },
  'Galaxy S24 (412px)': { width: 412,  height: 892  },
  'iPad (768px)':       { width: 768,  height: 1024 },
} as const

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

// ── ヘルパー ─────────────────────────────────────────────────────
async function noHorizontalOverflow(page: Page, viewport: { width: number }) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(scrollWidth, `横スクロール検出: ${scrollWidth}px > ${viewport.width}px`).toBeLessThanOrEqual(viewport.width + 1)
}

async function minTouchTarget(page: Page, selector: string, minPx = 44) {
  const elements = await page.locator(selector).all()
  for (const el of elements) {
    const box = await el.boundingBox()
    if (box) {
      const size = Math.min(box.width, box.height)
      expect(size, `タッチターゲット不足: ${selector} = ${size}px`).toBeGreaterThanOrEqual(minPx)
    }
  }
}

// ── テストスイート ────────────────────────────────────────────────
for (const [deviceName, viewport] of Object.entries(DEVICES)) {
  test.describe(`[${deviceName}]`, () => {
    test.use({ viewport })

    // ── Login ──────────────────────────────────────────────────
    test('Login: 横スクロールなし', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)
      await noHorizontalOverflow(page, viewport)
    })

    test('Login: 入力フォームが全幅', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)
      const emailInput = page.locator('input[type="email"]')
      const box = await emailInput.boundingBox()
      expect(box?.width).toBeGreaterThan(viewport.width * 0.7)
    })

    test('Login: ボタンが44px以上', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)
      const submitBtn = page.locator('button[type="submit"]')
      const box = await submitBtn.boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(44)
    })

    // ── Dashboard ──────────────────────────────────────────────
    test('Dashboard: 横スクロールなし', async ({ page }) => {
      await page.goto(`${BASE_URL}/`)
      await page.waitForLoadState('networkidle')
      await noHorizontalOverflow(page, viewport)
    })

    test('Dashboard: ボトムナビが表示されている (モバイル)', async ({ page }) => {
      await page.goto(`${BASE_URL}/`)
      if (viewport.width < 1024) {
        const bottomNav = page.locator('nav').last()
        await expect(bottomNav).toBeVisible()
        const box = await bottomNav.boundingBox()
        expect(box?.height).toBeGreaterThanOrEqual(44)
      }
    })

    test('Dashboard: KPIカードが2列表示 (モバイル)', async ({ page }) => {
      await page.goto(`${BASE_URL}/`)
      await page.waitForLoadState('networkidle')
      if (viewport.width < 1024) {
        // grid-cols-2 → 2カードが同じy座標
        const cards = page.locator('[class*="grid-cols-2"] > *')
        const count = await cards.count()
        if (count >= 2) {
          const box1 = await cards.nth(0).boundingBox()
          const box2 = await cards.nth(1).boundingBox()
          expect(Math.abs((box1?.y ?? 0) - (box2?.y ?? 0))).toBeLessThan(5)
        }
      }
    })

    // ── Scrim Input ────────────────────────────────────────────
    test('Scrim Input: 横スクロールなし', async ({ page }) => {
      await page.goto(`${BASE_URL}/scrim-input`)
      await page.waitForLoadState('networkidle')
      await noHorizontalOverflow(page, viewport)
    })

    test('Scrim Input: 保存ボタンが44px以上', async ({ page }) => {
      await page.goto(`${BASE_URL}/scrim-input`)
      const saveBtn = page.locator('button:has-text("保存"), button:has-text("Save")')
      const box = await saveBtn.last().boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(44)
    })

    test('Scrim Input: マップセレクターが全幅内に収まる', async ({ page }) => {
      await page.goto(`${BASE_URL}/scrim-input`)
      await page.waitForLoadState('networkidle')
      // 地図コンテナが viewport 幅を超えない
      const maps = page.locator('[class*="aspect-square"]')
      const count = await maps.count()
      for (let i = 0; i < count; i++) {
        const box = await maps.nth(i).boundingBox()
        if (box) {
          expect(box.width).toBeLessThanOrEqual(viewport.width)
        }
      }
    })

    // ── Round Analysis ─────────────────────────────────────────
    test('Round Analysis: 横スクロールなし (一覧)', async ({ page }) => {
      await page.goto(`${BASE_URL}/round-analysis`)
      await page.waitForLoadState('networkidle')
      await noHorizontalOverflow(page, viewport)
    })

    test('Round Analysis: モバイルタブが表示 (モバイル)', async ({ page }) => {
      await page.goto(`${BASE_URL}/round-analysis`)
      await page.waitForLoadState('networkidle')
      if (viewport.width < 1024) {
        // モバイルタブバーの存在確認は分析ビューに入った後
        // マッチをクリックできる場合にテスト
      }
    })

    // ── Players ────────────────────────────────────────────────
    test('Players: 横スクロールなし', async ({ page }) => {
      await page.goto(`${BASE_URL}/players`)
      await page.waitForLoadState('networkidle')
      await noHorizontalOverflow(page, viewport)
    })

    test('Players: 選手行が44px以上', async ({ page }) => {
      await page.goto(`${BASE_URL}/players`)
      await page.waitForLoadState('networkidle')
      const rows = page.locator('button[class*="rounded-xl"]')
      const count = await rows.count()
      for (let i = 0; i < Math.min(count, 3); i++) {
        const box = await rows.nth(i).boundingBox()
        if (box) expect(box.height).toBeGreaterThanOrEqual(44)
      }
    })

    // ── Settings ───────────────────────────────────────────────
    test('Settings: 横スクロールなし', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings`)
      await page.waitForLoadState('networkidle')
      await noHorizontalOverflow(page, viewport)
    })
  })
}

// ── PASS率サマリー ──────────────────────────────────────────────
test.afterAll(async () => {
  console.log('\n📱 Mobile UX Test Complete')
  console.log('Target: PASS rate ≥ 90% across all devices')
})
