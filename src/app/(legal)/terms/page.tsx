import Link from 'next/link'

export const metadata = { title: '利用規約 — AXELIA Analytics' }

export default function TermsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">利用規約</h1>
        <p className="text-sm text-muted-foreground mt-1">最終更新日：2026年6月24日</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">第1条（適用）</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          本利用規約は、AXELIA Analytics（以下「本サービス」）の利用条件を定めるものです。
          登録ユーザーは本規約に同意したうえで本サービスを利用してください。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">第2条（利用資格）</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          本サービスはVALORANTチームの戦績管理を目的としたツールです。
          チームアカウントを作成することで利用できます。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">第3条（禁止事項）</h2>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
          <li>他のユーザーのデータへの不正アクセス</li>
          <li>自動化ツールによる過度なリクエスト</li>
          <li>虚偽の情報の登録</li>
          <li>本サービスの逆コンパイル・改変</li>
          <li>法令または公序良俗に違反する行為</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">第4条（データの取り扱い）</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          ユーザーが入力したデータはチーム単位で管理されます。
          他のチームのデータへはアクセスできません。
          データの詳細な取り扱いについては<Link href="/privacy" className="text-[#FF4655] hover:underline">プライバシーポリシー</Link>をご確認ください。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">第5条（免責事項）</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          本サービスは現状有姿で提供されます。分析結果の正確性・完全性について保証しません。
          本サービスの利用により生じた損害について、当方は責任を負いません。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">第6条（サービスの変更・停止）</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          予告なくサービスの内容を変更・停止する場合があります。
        </p>
      </section>

      <div className="border-t border-border pt-6 text-center">
        <Link href="/privacy" className="text-sm text-[#FF4655] hover:underline">
          プライバシーポリシーはこちら →
        </Link>
      </div>
    </div>
  )
}
