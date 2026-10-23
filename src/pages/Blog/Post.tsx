import { Head, Link } from '@inertiajs/react'
import { href } from '@popcomputer/web/paths'
import type { WebPage } from '@popcomputer/web/react'
import { ArrowLeft } from 'lucide-react'

import { formatDate } from '~/components/format'
import Markdown from '~/components/Markdown'
import ReaderLayout from '~/components/ReaderLayout'
import UnderTheHood, { Guarantee } from '~/components/UnderTheHood'
import { paths } from '~/paths'

const DAY = 24 * 60 * 60 * 1000

/** One published post, as its readers see it. */
const BlogPost: WebPage<'Blog/Post'> = ({ blog, post }) => {
  const edited =
    post.publishedAt !== null && new Date(post.updatedAt).getTime() - new Date(post.publishedAt).getTime() > DAY

  return (
    <>
      <Head title={post.title}>
        {post.excerpt ? <meta name="description" content={post.excerpt} /> : null}
      </Head>
      <ReaderLayout blog={blog}>
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Link
            href={href(paths.blog, { blog: blog.slug })}
            className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-zinc-500 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-rose-600 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            All posts
          </Link>
          <header className="mt-8">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {post.publishedAt === null ? null : <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>}
              <span aria-hidden="true"> · </span>
              {post.readingMinutes} min read
              {edited ? (
                <>
                  <span aria-hidden="true"> · </span>
                  Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
                </>
              ) : null}
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{post.title}</h1>
            {post.excerpt ? (
              <p className="mt-5 font-serif text-xl leading-relaxed text-pretty text-zinc-600 dark:text-zinc-400">{post.excerpt}</p>
            ) : null}
          </header>
          <Markdown className="mt-10 font-serif prose-lg prose-headings:font-sans">{post.body}</Markdown>
        </article>
        <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
          <UnderTheHood route="GET /b/{blog:slug}/{publicPost:slug}" action="showPublicPost" compact>
            <Guarantee>
              The post is bound <code>publicWhen: {'{ status: ’published’ }'}</code>: a draft’s address is the 404 a
              missing post’s is.
            </Guarantee>
            <Guarantee>
              Cloudflare’s edge keeps this page with the post’s Cache-Tag, which the editor purges when it’s saved.
            </Guarantee>
          </UnderTheHood>
        </div>
      </ReaderLayout>
    </>
  )
}

export default BlogPost
