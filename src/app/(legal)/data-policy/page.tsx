import { PolicyContent } from '@/components/policy/PolicyContent'

async function getPolicy() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/policies/data_policy`,
      { cache: 'no-store' }
    )
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}

export default async function DataPolicyPage() {
  const policy = await getPolicy()

  if (!policy) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center text-slate-400">
        データ利用ポリシーを読み込めませんでした。
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="text-xs text-slate-500 uppercase tracking-widest">データ利用ポリシー</span>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>バージョン {policy.version}</span>
          <span>施行日 {String(policy.effective_date).slice(0, 10)}</span>
          <span>最終更新 {String(policy.updated_at).slice(0, 10)}</span>
        </div>
      </div>
      <PolicyContent content={policy.content} />
    </div>
  )
}
