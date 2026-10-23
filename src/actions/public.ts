import { and, desc, eq } from 'drizzle-orm'
import { Effect } from 'effect'
import { action, bound, dbQuery, file, render, RequestService, responseHeader, tagCache } from '@popcomputer/web/effect'
import { href } from '@popcomputer/web/paths'
import { paths } from '../paths'
import { posts } from '../schema'
import { plainExcerpt, readingMinutes } from '../text'
import { blogPostsTag } from './shared'

/** A blog's published posts, newest first. */
const publishedPosts = (blogId: string) =>
  Effect.gen(function* () {
    // Any guest's blog is public: search engines may read it, but not list it.
    yield* responseHeader('X-Robots-Tag', 'noindex')
    // The list changes whenever one of the blog's posts does: each write purges this tag.
    yield* tagCache(blogPostsTag(blogId))
    return yield* dbQuery((db) =>
      db
        .select()
        .from(posts)
        .where(and(eq(posts.blogId, blogId), eq(posts.status, 'published')))
        .orderBy(desc(posts.publishedAt))
    )
  })

/** The blog as its readers see it. Anyone may: the binding is public. */
export const showBlog = action(
  Effect.gen(function* () {
    const blog = yield* bound('blog')
    const rows = yield* publishedPosts(blog.id)

    return yield* render('Blog/Index', {
      blog,
      posts: rows.map((post) => ({
        ...post,
        excerpt: post.excerpt ?? plainExcerpt(post.body),
        readingMinutes: readingMinutes(post.body),
      })),
    })
  })
)

/** One published post. A draft's address is the 404 a missing post's is: the binding is publicWhen published. */
export const showPublicPost = action(
  Effect.gen(function* () {
    const blog = yield* bound('blog')
    const post = yield* bound('publicPost')
    yield* responseHeader('X-Robots-Tag', 'noindex')

    return yield* render('Blog/Post', { blog, post: { ...post, readingMinutes: readingMinutes(post.body) } })
  })
)

const xml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char] ?? char)

/**
 * The blog's RSS feed: its 20 newest posts, each with its excerpt. Its links
 * are absolute, from the address it was asked at, so it isn't cached: the
 * cache's key leaves out the host.
 */
export const showFeed = action(
  Effect.gen(function* () {
    const blog = yield* bound('blog')
    const rows = (yield* publishedPosts(blog.id)).slice(0, 20)
    const origin = new URL((yield* RequestService).url).origin
    const link = (path: string) => `${origin}${path}`

    const items = rows.map((post) =>
      [
        '<item>',
        `<title>${xml(post.title)}</title>`,
        `<link>${xml(link(href(paths.publicPost, { blog: blog.slug, publicPost: post.slug })))}</link>`,
        `<guid isPermaLink="false">${xml(post.id)}</guid>`,
        post.publishedAt === null ? '' : `<pubDate>${post.publishedAt.toUTCString()}</pubDate>`,
        `<description>${xml(post.excerpt ?? plainExcerpt(post.body))}</description>`,
        '</item>',
      ].join('')
    )
    const feed = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0"><channel>',
      `<title>${xml(blog.title)}</title>`,
      `<link>${xml(link(href(paths.blog, { blog: blog.slug })))}</link>`,
      `<description>${xml(blog.description ?? blog.title)}</description>`,
      ...items,
      '</channel></rss>',
    ].join('\n')

    return yield* file(feed, { contentType: 'application/rss+xml; charset=utf-8' })
  })
)
