import { cn } from '~/components/cn'

/** A post's status, as the editor names it. */
export default function StatusBadge({ status, className }: { readonly status: 'draft' | 'published'; readonly className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'published'
          ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 ring-inset dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900'
          : 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200 ring-inset dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700',
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', status === 'published' ? 'bg-emerald-500' : 'bg-zinc-400')}
      />
      {status === 'published' ? 'Published' : 'Draft'}
    </span>
  )
}
