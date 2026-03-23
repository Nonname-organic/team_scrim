export default function ExportLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, background: 'white', fontFamily: 'sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
