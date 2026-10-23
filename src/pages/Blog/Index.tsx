import { Head, Link } from '@inertiajs/react'
import { href } from '@popcomputer/web/paths'
import type { WebPage } from '@popcomputer/web/react'

import { formatDate } from '~/components/format'
import ReaderLayout from '~/components/ReaderLayout'
import UnderTheHood, { Guarantee } from '~/components/UnderTheHood'
import { paths } from '~/paths'

/** A blog's front page: its published posts, newest first. */
const BlogIndex: WebPage<'Blog/Index'> = ({ blog, posts }) => (
  <>
    <Head title={blog.title} />
    <ReaderLayout blog={blog}>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{blog.title}</h1>
        {blog.description ? (
          <p className="mt-4 font-serif text-lg text-pretty text-zinc-600 italic dark:text-zinc-400">{blog.description}</p>
        ) : null}

        {posts.length === 0 ? (
          <p className="mt-16 text-zinc-500">Nothing published yet.</p>
        ) : (
          <ol className="mt-14 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {posts.map((post) => (
              <li key={post.slug} className="py-8 first:pt-0">
                <article className="group relative">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {post.publishedAt === null ? null : <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>}
                    <span aria-hidden="true"> · </span>
                    {post.readingMinutes} min read
                  </p>
                  <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-balance group-hover:text-rose-700 dark:group-hover:text-rose-400">
                    <Link
                      href={href(paths.publicPost, { blog: blog.slug, publicPost: post.slug })}
                      className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-rose-600"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  {post.excerpt ? (
                    <p className="mt-3 font-serif text-lg leading-relaxed text-pretty text-zinc-700 dark:text-zinc-300">{post.excerpt}</p>
                  ) : null}
                </article>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <UnderTheHood route="GET /b/{blog:slug}" action="showBlog" compact>
          <Guarantee>
            Cloudflare’s edge keeps this page for five minutes, with Cache-Tags for the blog and its list, and a save in
            the editor purges them.
          </Guarantee>
          <Guarantee>Only published posts are listed: the query asks for them, and drafts never reach the page.</Guarantee>
        </UnderTheHood>
      </div>
    </ReaderLayout>
  </>
)

export default BlogIndex
