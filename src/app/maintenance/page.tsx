export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#0E0E14] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-[#FF4655]/20 flex items-center justify-center mx-auto">
          <span className="text-3xl">🔧</span>
        </div>
        <h1 className="text-2xl font-black text-white">メンテナンス中</h1>
        <p className="text-muted-foreground leading-relaxed">
          AXELIA Analytics は現在メンテナンス中です。<br />
          しばらくしてからアクセスしてください。
        </p>
        <p className="text-xs text-muted-foreground/60">
          ご不便をおかけして申し訳ありません。
        </p>
      </div>
    </div>
  )
}
