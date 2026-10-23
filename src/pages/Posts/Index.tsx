import { Head, Link } from '@inertiajs/react'
import { href } from '@popcomputer/web/paths'
import type { WebPage } from '@popcomputer/web/react'
import { ExternalLink, FileText, Plus } from 'lucide-react'
import { useState } from 'react'

import { buttonClassName } from '~/components/button'
import { cn } from '~/components/cn'
import EmptyState from '~/components/EmptyState'
import { formatDate, formatRelativeTime } from '~/components/format'
import Layout from '~/components/Layout'
import PageHeader from '~/components/PageHeader'
import StatusBadge from '~/components/StatusBadge'
import UnderTheHood, { Guarantee } from '~/components/UnderTheHood'
import { paths } from '~/paths'

const filters = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
] as const

type Filter = (typeof filters)[number]['key']

/** The editor's home: every post of the writer's blog, drafts too. */
const PostsIndex: WebPage<'Posts/Index'> = ({ blog, posts }) => {
  const [filter, setFilter] = useState<Filter>('all')
  const shown = filter === 'all' ? posts : posts.filter((post) => post.status === filter)
  const count = (key: Filter) => (key === 'all' ? posts.length : posts.filter((post) => post.status === key).length)

  return (
    <>
      <Head title="Posts" />
      <Layout blogSlug={blog.slug}>
        <PageHeader
          title={blog.title}
          description={blog.description ?? undefined}
          meta={
            <span className="font-mono text-xs">
              /b/{blog.slug}
            </span>
          }
          actions={
            <Link href={paths.newPost} className={buttonClassName()}>
              <Plus aria-hidden="true" />
              New post
            </Link>
          }
        />

        <div role="tablist" aria-label="Show" className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
          {filters.map((option) => (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={filter === option.key}
              onClick={() => setFilter(option.key)}
              className="-mb-px flex items-center gap-2 border-b-2 border-transparent px-3 pb-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-rose-600 aria-selected:border-rose-600 aria-selected:text-zinc-950 dark:text-zinc-400 dark:hover:text-white dark:aria-selected:border-rose-400 dark:aria-selected:text-white"
            >
              {option.label}
              <span className="rounded-full bg-zinc-100 px-1.5 text-xs tabular-nums dark:bg-zinc-800">{count(option.key)}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={filter === 'draft' ? 'No drafts' : filter === 'published' ? 'Nothing published yet' : 'No posts yet'}
            description="A post starts as a draft: only you see it until you publish it."
            action={
              <Link href={paths.newPost} className={buttonClassName()}>
                <Plus aria-hidden="true" />
                New post
              </Link>
            }
          />
        ) : (
          <ul aria-label="Posts" className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {shown.map((post) => (
              <li key={post.id} className="relative flex flex-col gap-2 p-4 hover:bg-zinc-50 sm:flex-row sm:items-center sm:gap-4 sm:px-5 dark:hover:bg-zinc-800/50">
                <div className="min-w-0 flex-1">
                  <Link
                    href={href(paths.editPost, { post: post.id })}
                    className="font-medium break-words after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-rose-600"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {post.status === 'published' && post.publishedAt !== null
                      ? `Published ${formatDate(post.publishedAt)}`
                      : `Edited ${formatRelativeTime(post.updatedAt)}`}
                    <span aria-hidden="true"> · </span>
                    <span className="tabular-nums">{post.words.toLocaleString()} words</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={post.status} />
                  {post.status === 'published' ? (
                    <a
                      href={href(paths.publicPost, { blog: blog.slug, publicPost: post.slug })}
                      className={cn(buttonClassName({ variant: 'ghost', size: 'sm' }), 'relative z-[1]')}
                      aria-label={`View “${post.title}” on your blog`}
                    >
                      View
                      <ExternalLink aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        <UnderTheHood route="GET /" action="listPosts">
          <Guarantee>Only your posts load here: the editor reads your blog by your session, never by an id in the address.</Guarantee>
          <Guarantee>
            Each post’s editor binds it <code>ownedBy: 'userId'</code>, so another writer’s post is the 404 a missing one
            is.
          </Guarantee>
          <Guarantee>A trigger keeps each post’s writer its blog’s writer, whatever writes the row.</Guarantee>
        </UnderTheHood>
      </Layout>
    </>
  )
}

export default PostsIndex
