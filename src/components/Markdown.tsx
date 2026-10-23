import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '~/components/cn'

// A reader's link leaves the site as a stranger's would: a guest wrote it.
const components: Components = {
  a: ({ node: _node, ...props }) => <a {...props} rel="nofollow ugc noopener" />,
  img: ({ node: _node, alt, ...props }) => <img {...props} alt={alt ?? ''} loading="lazy" decoding="async" />,
}

/**
 * A post's Markdown as HTML, with GitHub's tables, task lists and
 * strikethrough. Raw HTML in a post shows as text, never runs, and links
 * with a script for an address are dropped: react-markdown does both by default.
 */
export default function Markdown({ children, className }: { readonly children: string; readonly className?: string }) {
  return (
    <div
      className={cn(
        'prose prose-zinc max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-rose-700 prose-a:underline-offset-2 prose-pre:rounded-lg prose-img:rounded-lg dark:prose-a:text-rose-400',
        // Inline code on a tint, without the backticks the plugin adds; task lists without bullets.
        'prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none dark:prose-code:bg-zinc-800 prose-pre:prose-code:bg-transparent prose-pre:prose-code:p-0 [&_.contains-task-list]:list-none [&_.contains-task-list]:pl-0',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
