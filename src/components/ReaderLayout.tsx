import { Head, Link, usePage } from '@inertiajs/react'
import { href } from '@popcomputer/web/paths'
import { PenLine, Rss } from 'lucide-react'
import type { ReactNode } from 'react'

import { buttonClassName } from '~/components/button'
import usePageTransitionFocus from '~/components/usePageTransitionFocus'
import { paths } from '~/paths'

interface ReaderLayoutProps {
  readonly blog: { readonly slug: string; readonly title: string }
  readonly children: ReactNode
}

/**
 * The blog as readers see it: its name, its feed, and a line saying a
 * visitor wrote it, since any guest's blog is public.
 */
export default function ReaderLayout({ blog, children }: ReaderLayoutProps) {
  const { auth } = usePage().props
  const { mainRef, announcement } = usePageTransitionFocus()

  return (
    <div className="flex min-h-dvh flex-col bg-[#fdfcfa] dark:bg-zinc-950">
      <Head>
        <meta name="robots" content="noindex" />
        <link rel="alternate" type="application/rss+xml" title={blog.title} href={href(paths.feed, { blog: blog.slug })} />
      </Head>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3 dark:bg-zinc-900"
      >
        Skip to content
      </a>
      <p className="bg-zinc-900 px-4 py-2 text-center text-xs text-zinc-300 sm:text-sm">
        A demo blog a visitor wrote, on an example app built with{' '}
        <a href="https://web.popcomputer.com/examples" className="font-medium text-white underline underline-offset-2">
          @popcomputer/web
        </a>
        . It’s deleted a week after it began.
      </p>
      <header className="border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-5 sm:px-6">
          <Link
            href={href(paths.blog, { blog: blog.slug })}
            className="min-w-0 truncate rounded-sm font-serif text-xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-600"
          >
            {blog.title}
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <a href={href(paths.feed, { blog: blog.slug })} className={buttonClassName({ variant: 'ghost', size: 'sm' })} aria-label="RSS feed">
              <Rss aria-hidden="true" />
              <span className="hidden sm:inline">RSS</span>
            </a>
            <Link href={paths.dashboard} className={buttonClassName({ variant: 'secondary', size: 'sm' })}>
              <PenLine aria-hidden="true" />
              {auth.user ? 'Editor' : 'Write your own'}
            </Link>
          </div>
        </div>
      </header>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>

      <main ref={mainRef} id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
    </div>
  )
}
