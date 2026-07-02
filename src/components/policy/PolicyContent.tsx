'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
}

export function PolicyContent({ content }: Props) {
  return (
    <div className="prose prose-invert prose-sm max-w-none
      prose-headings:text-white prose-headings:font-bold
      prose-h1:text-2xl prose-h1:mb-6 prose-h1:pb-3 prose-h1:border-b prose-h1:border-border
      prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-slate-100
      prose-p:text-slate-300 prose-p:leading-relaxed
      prose-li:text-slate-300 prose-li:leading-relaxed
      prose-strong:text-white
      prose-a:text-[#FF4655] prose-a:no-underline hover:prose-a:underline
      prose-table:text-sm prose-table:border-collapse
      prose-th:bg-white/5 prose-th:text-white prose-th:px-4 prose-th:py-2 prose-th:border prose-th:border-border prose-th:text-left
      prose-td:text-slate-300 prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-border
      prose-blockquote:border-l-[#FF4655] prose-blockquote:text-slate-400
      prose-hr:border-border
      prose-code:text-[#FF4655] prose-code:bg-white/5 prose-code:px-1 prose-code:rounded">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
