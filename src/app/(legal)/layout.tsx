export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0E0E14] text-white px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {children}
      </div>
    </div>
  )
}
