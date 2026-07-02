'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-black text-white mb-6 pb-3 border-b border-white/10 leading-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold text-white mt-10 mb-3 pb-1 border-b border-white/5">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-slate-100 mt-6 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-slate-300 leading-relaxed mb-4 text-sm">{children}</p>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-2 mb-4 pl-5 text-sm text-slate-300">{children}</ol>
  ),
  ul: ({ children }) => (
    <ul className="list-disc space-y-1.5 mb-4 pl-5 text-sm text-slate-300">{children}</ul>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-[#FF4655] hover:underline">{children}</a>
  ),
  hr: () => <hr className="border-white/10 my-6" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#FF4655]/50 pl-4 text-slate-400 italic my-4 text-sm">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
  th: ({ children }) => (
    <th className="text-white px-4 py-2 border border-white/10 text-left font-semibold text-sm">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="text-slate-300 px-4 py-2 border border-white/10 text-sm">{children}</td>
  ),
  code: ({ children }) => (
    <code className="text-[#FF4655] bg-white/5 px-1.5 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  ),
}

interface Props {
  content: string
}

export function PolicyContent({ content }: Props) {
  return (
    <div className="text-slate-300">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
