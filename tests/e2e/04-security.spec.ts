import { test, expect } from '@playwright/test'

// ────────────────────────────────────────────────────────────────
// セキュリティテスト (17 ケース)
// ────────────────────────────────────────────────────────────────

test.describe('認証バイパス防止', () => {
  const PROTECTED_APIS = [
    '/api/matches',
    '/api/players',
    '/api/rounds',
    '/api/teams',
    '/api/analysis/dashboard',
    '/api/user/plan',
    '/api/auth/me',
  ]

  for (const endpoint of PROTECTED_APIS) {
    test(`TC-S01-${endpoint}: 未認証GETは401を返す`, async ({ request }) => {
      const res = await request.get(endpoint)
      expect(res.status()).toBe(401)
    })
  }

  test('TC-S08: 未認証でmatches/[id]にGETすると401', async ({ request }) => {
    const res = await request.get('/api/matches/f15a5c97-96c6-4450-abbb-c9904ee7dfbb')
    expect(res.status()).toBe(401)
  })

  test('TC-S09: 未認証でmatches/[id]にPATCHすると401', async ({ request }) => {
    const res = await request.patch('/api/matches/f15a5c97-96c6-4450-abbb-c9904ee7dfbb', {
      data: { notes: 'hacked' },
    })
    expect(res.status()).toBe(401)
  })

  test('TC-S10: 未認証でmatches/[id]にDELETEすると401', async ({ request }) => {
    const res = await request.delete('/api/matches/f15a5c97-96c6-4450-abbb-c9904ee7dfbb')
    expect(res.status()).toBe(401)
  })

  test('TC-S11: 未認証でplayers/[id]にPATCHすると401', async ({ request }) => {
    const res = await request.patch('/api/players/00000000-0000-0000-0000-000000000001', {
      data: { ign: 'hacked' },
    })
    expect(res.status()).toBe(401)
  })

  test('TC-S12: 未認証でplayers/[id]にDELETEすると401', async ({ request }) => {
    const res = await request.delete('/api/players/00000000-0000-0000-0000-000000000001')
    expect(res.status()).toBe(401)
  })

  test('TC-S13: 未認証でplayers/[id]/statsにPOSTすると401', async ({ request }) => {
    const res = await request.post('/api/players/00000000-0000-0000-0000-000000000001/stats', {
      data: { match_id: '00000000-0000-0000-0000-000000000001', kills: 99 },
    })
    expect(res.status()).toBe(401)
  })

  test('TC-S14: 未認証でfeedback/coachにPOSTすると401', async ({ request }) => {
    const res = await request.post('/api/feedback/coach', {
      data: { match_id: '00000000-0000-0000-0000-000000000001' },
    })
    expect(res.status()).toBe(401)
  })

  test('TC-S15: 未認証でfeedback/aiにPOSTすると401', async ({ request }) => {
    const res = await request.post('/api/feedback/ai', {
      data: { match_id: '00000000-0000-0000-0000-000000000001' },
    })
    expect(res.status()).toBe(401)
  })

  test('TC-S16: 未認証でOCRにPOSTすると401', async ({ request }) => {
    const res = await request.post('/api/ocr', {
      multipart: { image: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('') } },
    })
    expect(res.status()).toBe(401)
  })

  test('TC-S17: エラーレスポンスにスタックトレースが含まれない', async ({ request }) => {
    const res = await request.get('/api/matches')
    const body = await res.json()
    // エラーメッセージにファイルパスやスタックトレースが含まれていない
    const bodyStr = JSON.stringify(body)
    expect(bodyStr).not.toMatch(/at Object\.|\.ts:\d+|node_modules/)
  })
})

test.describe('ヘルスチェック', () => {
  test('TC-S18: /api/health は認証なしでアクセスできる', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
  })

  test('TC-S19: /api/health のレスポンスに status フィールドがある', async ({ request }) => {
    const res = await request.get('/api/health')
    const body = await res.json()
    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('ts')
  })
})
