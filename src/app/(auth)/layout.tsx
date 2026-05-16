export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#18181F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="AXELIA Analytics" className="w-9 h-9 rounded-xl object-cover" />
            <div className="text-sm font-bold text-white tracking-wider">AXELIA Analytics</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
