# セッションセキュリティ設定手順（PR-8）

AXELIA Analytics のセッション堅牢化。**コード変更（middleware）** と **Supabase Dashboard 設定** の2部構成。
既存ユーザーへの影響を最小化し、停止時間ゼロで適用できる。

---

## 1. 目的

| 観点 | 対策 |
|---|---|
| トークン漏洩時の被害時間短縮 | アクセストークン短寿命化（1時間） |
| 放置セッションの無期限化防止 | セッション最大寿命の上限設定（7日） |
| 共有端末でのデータ残留防止 | 認証済みページの `Cache-Control: no-store`（コード側・実装済み） |
| リフレッシュトークン再利用攻撃の緩和 | Refresh token rotation 有効化 |

---

## 2. コード側（実装済み・デプロイで有効化）

`src/middleware.ts` に以下を追加済み。追加のインフラ設定は不要。

```ts
if (user) {
  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
}
```

- **対象**: ログイン済みユーザーに返す全ページ（保護コンテンツ）
- **効果**: チーム分析データがブラウザ / プロキシ / BFCache に残らず、共有端末で「戻る」ボタンを押しても再認証を経ずにデータが表示されない
- **非対象**: 静的アセット（`matcher` で除外済み）、未ログイン時のログイン画面等

---

## 3. Supabase Dashboard 設定（運用者が手動実施）

> ⚠️ これらは**コードではなく Supabase プロジェクト設定**。反映は即時で、既存セッションは次回トークン更新時から新設定に従う（強制ログアウトは発生しない）。

### 3-1. アクセストークン（JWT）有効期限 → 1時間

1. Supabase Dashboard → **Authentication** → **Sessions**（または **Settings**）
2. **Access token (JWT) expiry** を確認
3. 値: **`3600`（秒 = 1時間）** ※Supabase デフォルトが 3600 のため、既定のままなら変更不要
4. 保存

### 3-2. セッション最大寿命（リフレッシュトークン相当）→ 7日

Supabase のリフレッシュトークンは rotation 有効時、既定で無期限に更新され続ける。
これを 7 日で強制失効させる。

1. **Authentication** → **Sessions**
2. **Time-box user sessions** を有効化
3. 値: **`604800`（秒 = 7日）**
4. 保存

> 補足: **Inactivity timeout**（非アクティブ失効）も併用可能。例: `86400`（1日）に設定すると、24時間操作がないセッションを失効させる。1チーム共有運用のため、まずは Time-box（絶対7日）のみで開始し、必要に応じて追加する。

### 3-3. Refresh token rotation → 有効

1. **Authentication** → **Sessions**
2. **Refresh token rotation** を **Enabled**
3. **Reuse interval**: `10`（秒。デフォルト）
4. 保存

### 3-4. 並列セッション → 制限しない（現状維持）

- 仕様どおり、複数デバイスからの同時ログインは**許容**する。
- 「Single session per user」は**有効化しない**（1チーム内で代表者＋メンバーが別端末から利用する運用のため、破壊的変更となる）。
- 将来的に制限が必要になった場合のみ、Dashboard の該当項目で切り替える。

---

## 4. 適用順序（推奨）

```
1. middleware 変更を含むデプロイ（Cache-Control 有効化）
   └ 既存ユーザー影響: なし（次回ページ遷移から適用）

2. Supabase Dashboard 3-3（rotation）→ 3-1（JWT expiry 確認）→ 3-2（Time-box）
   └ 既存セッション: 次回トークン更新時に新設定へ移行。強制ログアウトなし。
```

---

## 5. 動作確認

### Cache-Control（コード側）
```
# ログイン後の Cookie を付けて保護ページを取得し、ヘッダを確認
curl -I https://axelia-analytics.vercel.app/ -H "Cookie: <sb-...-auth-token=...>"
# 期待: Cache-Control: no-store, max-age=0, must-revalidate
```

### トークン期限（Dashboard 側）
1. ログインして 1 時間放置 → 次のAPIアクセスでアクセストークンが自動更新されることを確認（透過的）
2. 7 日経過後 → 再ログインが要求されることを確認（Time-box）

### セッション失効ログ
壊れた/失効したトークンでのアクセスは既存の middleware ロジックにより
`sb-*` Cookie が削除され `/login` へ誘導される（PR前から実装済み）。

---

## 6. ロールバック手順

| 対象 | ロールバック |
|---|---|
| Cache-Control（コード） | `middleware.ts` の PR-8 ブロックを削除して再デプロイ |
| JWT expiry | Dashboard で `3600` に戻す（＝デフォルト） |
| Time-box user sessions | Dashboard で無効化 |
| Refresh token rotation | Dashboard で Disabled に戻す |

いずれも**既存データ・既存ユーザーに破壊的影響なし**。設定変更は即時反映され、進行中セッションは次回更新時に旧設定へ戻る。

---

## 7. 影響分析

| 項目 | 影響 |
|---|---|
| ユーザー影響 | なし（強制ログアウトは発生しない。7日超の放置セッションのみ再ログインが必要） |
| 停止時間 | ゼロ |
| 移行コスト | Dashboard 設定 3項目（数分） |
| 監視項目 | `security_logs` の認証失敗率、再ログイン頻度の急増 |
| ロールバック | 即時・非破壊 |
