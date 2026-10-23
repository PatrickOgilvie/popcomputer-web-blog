import { expect } from 'bun:test'
import { Redacted } from 'effect'
import { signedIn, testBrowser, testEnv, testRateLimiter, type TestBrowser } from '@popcomputer/web/testing'
import { app } from '../src/app'
import { createDb } from '../src/db'
import { blogRows } from '../src/demo'
import { paths } from '../src/paths'
import { blogs, posts, user } from '../src/schema'
import { databases } from './databases'
import '../src/routes'

export { app }

/** The Worker's bindings, with a new, empty D1 database. */
export async function freshBindings() {
  return {
    DB: await databases.fresh(),
    BETTER_AUTH_SECRET: 'test-only-secret-0123456789abcdef0123456789',
    SIGN_IN_LIMITER: testRateLimiter(),
    ENVIRONMENT: 'test' as const,
  }
}

export async function freshEnv() {
  return testEnv(await freshBindings())
}

export type Env = Awaited<ReturnType<typeof freshEnv>>

/** A request as Inertia sends a form: its fields as JSON. */
export function send(method: 'POST' | 'PUT' | 'DELETE', fields: Record<string, unknown> = {}): RequestInit {
  return {
    method,
    headers: { 'X-Inertia': 'true', 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  }
}

/** Whether a response sends the visitor to sign in. */
export function asksToSignIn(res: Response): boolean {
  return new URL(res.headers.get('Location') ?? '/', 'http://localhost').pathname === paths.login
}

/** A visit to a page, as Inertia makes it. */
export const visit: RequestInit = { headers: { 'X-Inertia': 'true' } }

/** A visitor who starts the demo: a guest of their own, with a sample blog. */
export async function startDemo(env: Env): Promise<TestBrowser> {
  const browser = testBrowser(app, env)
  const res = await browser.request(paths.login, send('POST'))

  expect(res.headers.get('Location')).toBe(paths.dashboard)

  return browser
}

/**
 * A writer with the sample blog, signed in as their session would sign them
 * in, and the env their requests run with, for a test that sends them with
 * `app.request` itself.
 */
export async function writer(bindings: Awaited<ReturnType<typeof freshBindings>>, name = 'Ada Lovelace') {
  const now = new Date()
  const row = {
    id: crypto.randomUUID(),
    name,
    email: `${crypto.randomUUID()}@example.com`,
    emailVerified: false,
    image: null,
    createdAt: now,
    updatedAt: now,
    isAnonymous: false,
  }
  const db = createDb(bindings.DB)
  await db.insert(user).values(row)
  const rows = blogRows(row.id, name, now)
  await db.insert(blogs).values(rows.blog)
  for (const post of rows.posts) await db.insert(posts).values(post)

  const session = {
    id: `session-${row.id}`,
    token: Redacted.make(`token-${row.id}`),
    userId: row.id,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
    ipAddress: null,
    userAgent: null,
  }
  const env = testEnv(signedIn({ user: row, session }), bindings)

  return { env, browser: testBrowser(app, env), blog: rows.blog, userId: row.id }
}

/** The fields a post's form sends, from what a test changes. */
export const postFields = (fields: Record<string, unknown> = {}) => ({
  title: 'Field notes',
  slug: 'field-notes',
  excerpt: null,
  body: 'Something worth reading.',
  status: 'draft',
  ...fields,
})

/** The id at the end of a redirect to a post's editor, `/posts/{post}/edit`. */
export function editedId(res: Response): string {
  const match = /^\/posts\/([^/]+)\/edit$/.exec(res.headers.get('Location') ?? '')

  expect(match).not.toBeNull()

  return match?.[1] ?? ''
}
