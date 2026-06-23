import Link from 'next/link'

export const metadata = { title: 'プライバシーポリシー — AXELIA Analytics' }

export default function PrivacyPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">プライバシーポリシー</h1>
        <p className="text-sm text-muted-foreground mt-1">最終更新日：2026年6月24日</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">収集する情報</h2>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
          <li>メールアドレス（認証用）</li>
          <li>チーム名・選手名（ユーザーが入力した試合データ）</li>
          <li>試合スコア・ラウンドデータ（分析に使用）</li>
          <li>アクセスログ（障害対応・不正利用検知用）</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">情報の利用目的</h2>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
          <li>本サービスの提供・改善</li>
          <li>不正アクセス・異常利用の検知</li>
          <li>サポート対応</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">第三者への提供</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          法令に基づく場合を除き、ユーザーの同意なく第三者に個人情報を提供しません。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">使用しているサービス</h2>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
          <li>Supabase（認証・データベース）</li>
          <li>Vercel（ホスティング）</li>
          <li>Anthropic Claude（AI分析機能）※現在停止中</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">データの削除</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          設定画面からアカウントを削除できます。
          削除すると登録データは全て消去されます。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">お問い合わせ</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          プライバシーに関するお問い合わせは<Link href="/contact" className="text-[#FF4655] hover:underline">お問い合わせページ</Link>からご連絡ください。
        </p>
      </section>

      <div className="border-t border-border pt-6 text-center">
        <Link href="/terms" className="text-sm text-[#FF4655] hover:underline">
          利用規約はこちら →
        </Link>
      </div>
    </div>
  )
}
