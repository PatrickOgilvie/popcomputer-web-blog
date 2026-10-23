// The blog each guest gets when they start the demo: three published posts
// and a draft, all their own.
import { DateTime, Effect } from 'effect'
import { dbBatch } from '@popcomputer/web/effect'
import { blogs, posts } from './schema'
import { slugify } from './text'

const DAY = 24 * 60 * 60 * 1000

const samplePosts: ReadonlyArray<{
  readonly title: string
  readonly excerpt: string | null
  readonly body: string
  /** Days ago it was published; a draft has none. */
  readonly published: number | null
}> = [
  {
    title: 'How this blog stays fast',
    excerpt: 'Readers get every page from Cloudflare’s cache, and an edit clears exactly the pages it changed.',
    published: 6,
    body: `Every page a reader sees here, the list of posts and each post, is kept in Cloudflare's cache at the edge, close to the reader. The Worker that renders it runs once; after that, the cache answers.

## Clearing what changed

Each cached page carries tags naming the records it shows: this post's page carries the post's and the blog's. When you save a post in the editor, the save clears its tags, so the next reader gets the new version straight away.

- Saving a post clears its own page and the blog's list.
- Changing the blog's title clears every page of the blog.
- Nothing else is touched: another blog's pages stay cached.

## What the cache never keeps

Your own visits, while you're signed in, are rendered afresh for you, so you always see what you wrote. Drafts are never on a public page at all: their address answers *not found* until you publish.`,
  },
  {
    title: 'Writing in Markdown',
    excerpt: null,
    published: 1,
    body: `The editor takes Markdown, and shows you the result as you type in the preview. Here's most of what it understands.

## Headings and emphasis

Two hashes start a heading; three, a smaller one. Wrap words in *one asterisk* for emphasis, **two** for strong, and \`backticks\` for code.

### Lists

- A dash starts a bullet
- Numbers start an ordered list
- [x] Brackets make a task list
- [ ] like this one

### Quotes and code

> A quote starts with a greater-than sign, and keeps its line breaks
> together.

\`\`\`ts
// Three backticks start a block of code.
const greeting = 'Hello from the editor'
\`\`\`

### Links and tables

Link to [the framework](https://web.popcomputer.com) with square brackets and round ones.

| Writes | Reads |
| --- | --- |
| The editor | Your own posts |
| Readers | Published posts only |

Raw HTML is shown as text, never run: a post can't add a script to the page.`,
  },
  {
    title: 'Welcome to your blog',
    excerpt: 'This blog is yours for a week: write, publish, take posts down again, and see what readers see.',
    published: 3,
    body: `This blog is yours for a week. Everything here is a sample you can change or delete.

## Try this

1. Open **Writing in Markdown** in the editor and change a line. Save it, then open the post on your blog: the change is there.
2. Publish the draft called **Ideas for next week**, and it joins this list.
3. Rename the blog in **Settings**, or give it a new address.

## Who can see what

Readers see published posts at your blog's address, and its RSS feed. Drafts stay in the editor until you publish them, and taking a post down puts it back among them.

After a week, the blog and everything in it are deleted.`,
  },
  {
    title: 'Ideas for next week',
    excerpt: null,
    published: null,
    body: `A draft: readers can't see it until it's published.

- A post about the week's best idea
- Photos from the walk on Sunday
- That recipe everyone asked about`,
  },
]

const randomSuffix = () => crypto.randomUUID().slice(0, 4)

/** The rows of a guest's blog, as `seedBlog` writes them. */
export function blogRows(userId: string, name: string, now: Date) {
  const blogId = crypto.randomUUID()
  const blog = {
    id: blogId,
    userId,
    slug: `${slugify(name, 30)}-${randomSuffix()}`,
    title: `${name}’s notebook`,
    description: 'Notes from a week of trying a blog with a CMS behind it.',
    createdAt: now,
    updatedAt: now,
  }
  const postRows = samplePosts.map((sample) => {
    const publishedAt = sample.published === null ? null : new Date(now.getTime() - sample.published * DAY)
    return {
      blogId,
      userId,
      slug: slugify(sample.title),
      title: sample.title,
      excerpt: sample.excerpt,
      body: sample.body,
      status: sample.published === null ? ('draft' as const) : ('published' as const),
      publishedAt,
      createdAt: publishedAt ?? now,
      updatedAt: publishedAt ?? now,
    }
  })
  return { blog, posts: postRows }
}

/** Gives a new guest their blog, in one batch: all of it, or none. */
export const seedBlog = (userId: string, name: string) =>
  Effect.gen(function* () {
    const rows = blogRows(userId, name, DateTime.toDateUtc(yield* DateTime.now))

    yield* dbBatch((db) => [db.insert(blogs).values(rows.blog), ...rows.posts.map((post) => db.insert(posts).values(post))])
  })
