import { describe, expect, test } from 'bun:test'
import { href } from '@popcomputer/web/paths'
import { readPage, testBrowser, testClock, testEnv, type TestBrowser } from '@popcomputer/web/testing'
import { createAuth } from '../src/auth'
import { createDb } from '../src/db'
import { paths } from '../src/paths'
import worker from '../src/worker'
import { app, asksToSignIn, editedId, freshBindings, freshEnv, postFields, send, startDemo, visit, writer } from './app'
import { databases } from './databases'

const editor = async (browser: TestBrowser) => (await readPage(await browser.request(paths.dashboard, visit), 'Posts/Index')).props

const publicBlog = async (browser: TestBrowser, blog: string) =>
  (await readPage(await browser.request(href(paths.blog, { blog }), visit), 'Blog/Index')).props

describe('the demo', () => {
  test('the sign-in page starts it, and nobody registers', async () => {
    const guest = testBrowser(app, await freshEnv())

    await readPage(await guest.request(paths.login, visit), 'Auth/Login')
    expect((await guest.request('/register', visit)).status).toBe(404)
    expect(asksToSignIn(await guest.request(paths.dashboard))).toBe(true)
  })

  test('a guest gets a blog of their own: three posts published and a draft', async () => {
    const browser = await startDemo(await freshEnv())
    const { blog, posts } = await editor(browser)

    expect(blog.title).toMatch(/’s notebook$/)
    expect(blog.slug).toMatch(/^[a-z0-9-]+-[0-9a-f]{4}$/)
    expect(posts.map((post) => [post.title, post.status])).toEqual([
      ['Ideas for next week', 'draft'],
      ['Writing in Markdown', 'published'],
      ['Welcome to your blog', 'published'],
      ['How this blog stays fast', 'published'],
    ])
  })

  test('the daily sweep deletes guests after a week, with their blogs', async () => {
    const bindings = await freshBindings()
    const browser = await startDemo(testEnv(bindings))
    const time = await testClock(Date.now() + 8 * 24 * 60 * 60 * 1000)

    await worker.scheduled({ cron: '0 3 * * *', scheduledTime: Date.now() }, testEnv(time.layer, bindings))

    expect(asksToSignIn(await browser.request(paths.dashboard))).toBe(true)
    expect(await bindings.DB.prepare('SELECT (SELECT count(*) FROM blogs) AS blogs, (SELECT count(*) FROM posts) AS posts').first()).toEqual({
      blogs: 0,
      posts: 0,
    })
  })
})

describe("the app's address", () => {
  // Better Auth makes its cookies Secure, with the __Secure- prefix, when its
  // baseURL is https: the cookie shows which address it took.
  test('is APP_URL to Better Auth, whichever address a request reached', async () => {
    const env = testEnv({ ...(await freshBindings()), APP_URL: 'https://blog.example.com' })

    const res = await app.request('http://localhost/login', send('POST'), env)

    expect(res.headers.get('Location')).toBe(paths.dashboard)
    expect(res.headers.getSetCookie().some((cookie) => cookie.startsWith('__Secure-better-auth.session_token='))).toBe(true)
  })

  // Better Auth checks a request's Origin only once it carries a cookie, and
  // never under bun test unless told to, so this asks src/auth.ts's own
  // options with the check on.
  test('lets Better Auth trust the page’s own address, a Version URL bun run preview shares, and no other', async () => {
    const version = 'https://1a2b3c4d-popcomputer-web-blog.example.workers.dev'
    const auth = createAuth({
      db: createDb(await databases.fresh()),
      secret: 'test-only-secret-0123456789abcdef0123456789',
      baseURL: 'https://blog.example.com',
      advanced: { disableOriginCheck: false },
      logger: { disabled: true },
    })
    const startAt = (origin: string) =>
      auth.handler(
        new Request(`${version}/api/auth/sign-in/anonymous`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: 'theme=dark', Origin: origin },
          body: '{}',
        })
      )

    expect((await startAt(version)).status).toBe(200)
    expect((await startAt('https://elsewhere.example')).status).toBe(403)
  })
})

describe('readers', () => {
  test('see the published posts, newest first, without signing in', async () => {
    const env = await freshEnv()
    const { blog } = await editor(await startDemo(env))
    const reader = testBrowser(app, env)

    const page = await publicBlog(reader, blog.slug)

    expect(page.blog.title).toBe(blog.title)
    expect(page.posts.map((post) => post.title)).toEqual(['Writing in Markdown', 'Welcome to your blog', 'How this blog stays fast'])
    // A post without an excerpt of its own shows its first paragraph.
    expect(page.posts[0]?.excerpt).toStartWith('The editor takes Markdown')

    const post = await readPage(
      await reader.request(href(paths.publicPost, { blog: blog.slug, publicPost: 'writing-in-markdown' }), visit),
      'Blog/Post'
    )

    expect(post.props.post.body).toContain('## Headings and emphasis')
  })

  test('get the 404 a missing post gets at a draft’s address', async () => {
    const env = await freshEnv()
    const { blog } = await editor(await startDemo(env))
    const draft = href(paths.publicPost, { blog: blog.slug, publicPost: 'ideas-for-next-week' })

    expect((await testBrowser(app, env).request(draft, visit)).status).toBe(404)
    expect((await testBrowser(app, env).request(href(paths.blog, { blog: 'no-such-blog' }), visit)).status).toBe(404)
  })

  test('get an RSS feed of the published posts, escaped', async () => {
    const env = await freshEnv()
    const browser = await startDemo(env)
    const { blog } = await editor(browser)
    await browser.request(paths.posts, send('POST', postFields({ title: 'Fish & <chips>', slug: 'fish-and-chips', status: 'published' })))

    const res = await testBrowser(app, env).request(href(paths.feed, { blog: blog.slug }))
    const feed = await res.text()

    expect(res.headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8')
    expect(feed).toContain('<title>Fish &amp; &lt;chips&gt;</title>')
    expect(feed).toContain(`<link>http://localhost/b/${blog.slug}/fish-and-chips</link>`)
    expect(feed).not.toContain('Ideas for next week')
  })

  test('pages carry Cache-Tags and stay in Cloudflare’s cache, not the browser’s', async () => {
    const env = await freshEnv()
    const { blog } = await editor(await startDemo(env))

    const res = await app.request(href(paths.blog, { blog: blog.slug }), undefined, env)

    expect(res.headers.get('Cloudflare-CDN-Cache-Control')).toBe('public, max-age=300, stale-while-revalidate=86400')
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate')
    expect(res.headers.get('Cache-Tag')?.split(',')).toContain(`posts:blog-${blog.id}`)
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex')
  })
})

describe('the editor', () => {
  test('writes a draft, publishes it, and takes it down again, keeping its date', async () => {
    const env = await freshEnv()
    const browser = await startDemo(env)
    const { blog } = await editor(browser)
    const reader = testBrowser(app, env)
    const address = href(paths.publicPost, { blog: blog.slug, publicPost: 'field-notes' })

    const created = await browser.request(paths.posts, send('POST', postFields()))
    const post = editedId(created)

    expect((await reader.request(address, visit)).status).toBe(404)

    const published = await browser.request(href(paths.post, { post }), send('PUT', postFields({ status: 'published' })))
    const page = await readPage(await browser.follow(published), 'Posts/Editor')
    const publishedAt = page.props.post?.publishedAt

    expect(page.flash.success).toBe('Published.')
    expect(publishedAt).not.toBeNull()
    expect((await reader.request(address, visit)).status).toBe(200)

    await browser.request(href(paths.post, { post }), send('PUT', postFields({ status: 'draft' })))
    const draft = await readPage(await browser.request(href(paths.editPost, { post }), visit), 'Posts/Editor')

    expect(draft.props.post).toMatchObject({ status: 'draft', publishedAt })
    expect((await reader.request(address, visit)).status).toBe(404)
  })

  test('another writer’s post is the 404 a missing one is', async () => {
    const env = await freshEnv()
    const ada = await startDemo(env)
    const grace = await startDemo(env)
    const post = (await editor(ada)).posts[0]?.id ?? ''

    expect((await grace.request(href(paths.editPost, { post }), visit)).status).toBe(404)
    expect((await grace.request(href(paths.post, { post }), send('PUT', postFields()))).status).toBe(404)
    expect((await grace.request(href(paths.post, { post }), send('DELETE'))).status).toBe(404)
  })

  test('two posts of one blog can’t share an address, and an address keeps to its letters', async () => {
    const browser = await startDemo(await freshEnv())
    await browser.request(paths.newPost, visit)

    const taken = await browser.request(paths.posts, send('POST', postFields({ slug: 'writing-in-markdown' })))
    const page = await readPage(await browser.follow(taken), 'Posts/Editor')

    expect(page.props.errors.slug).toBe('Another of your posts has this address.')

    const odd = await browser.request(paths.posts, send('POST', postFields({ slug: 'Not A Slug!' })))

    expect((await readPage(await browser.follow(odd), 'Posts/Editor')).props.errors.slug).toMatch(/lowercase letters/)
  })

  test('deletes a post', async () => {
    const env = await freshEnv()
    const browser = await startDemo(env)
    const before = await editor(browser)
    const post = before.posts.find((summary) => summary.slug === 'writing-in-markdown')?.id ?? ''

    const res = await browser.request(href(paths.post, { post }), send('DELETE'))

    expect(res.headers.get('Location')).toBe(paths.dashboard)
    expect((await editor(browser)).posts).toHaveLength(3)
    expect((await publicBlog(testBrowser(app, env), before.blog.slug)).posts).toHaveLength(2)
  })

  test('a save purges the post’s pages and its blog’s list, and settings every page of the blog', async () => {
    const bindings = await freshBindings()
    const { env, blog } = await writer(bindings)
    const purged: Array<string> = []
    const ctx = {
      waitUntil: () => {},
      passThroughOnException: () => {},
      props: {},
      cache: {
        purge: async (input: { tags?: Array<string> }) => {
          purged.push(...(input.tags ?? []))
          return { success: true }
        },
      },
    }
    const created = await app.request(paths.posts, send('POST', postFields()), env, ctx)
    const post = editedId(created)
    purged.length = 0

    await app.request(href(paths.post, { post }), send('PUT', postFields({ status: 'published' })), env, ctx)

    expect(purged).toEqual(expect.arrayContaining([`posts:${post}`, `posts:blog-${blog.id}`]))

    purged.length = 0
    await app.request(paths.settings, send('PUT', { title: 'Ada’s notes', description: null, slug: 'adas-notes' }), env, ctx)

    expect(purged).toEqual([`blogs:${blog.id}`])
  })
})

describe('settings', () => {
  test('rename the blog and move it to a new address, which no other blog has', async () => {
    const env = await freshEnv()
    const ada = await startDemo(env)
    const grace = await startDemo(env)
    const graces = (await editor(grace)).blog.slug
    await ada.request(paths.settings, visit)

    const taken = await ada.request(paths.settings, send('PUT', { title: 'Mine', description: null, slug: graces }))

    expect((await readPage(await ada.follow(taken), 'Settings')).props.errors.slug).toBe('Another blog has this address.')

    await ada.request(paths.settings, send('PUT', { title: 'Ada’s notes', description: 'Sums and engines.', slug: 'adas-notes' }))

    expect((await publicBlog(testBrowser(app, env), 'adas-notes')).blog).toEqual({
      slug: 'adas-notes',
      title: 'Ada’s notes',
      description: 'Sums and engines.',
    })
  })
})

describe('the database', () => {
  test('keeps a post’s writer its blog’s, whatever writes the row', async () => {
    const bindings = await freshBindings()
    const ada = await writer(bindings, 'Ada')
    const grace = await writer(bindings, 'Grace')

    const insert = bindings.DB.prepare(
      "INSERT INTO posts (id, blog_id, user_id, slug, title, created_at, updated_at) VALUES ('stray', ?, ?, 'stray', 'Stray', 0, 0)"
    ).bind(ada.blog.id, grace.userId)

    expect(insert.run()).rejects.toThrow(/posts_blog_owner/)
  })
})
