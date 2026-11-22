/**
 * Generated requests to every route, from a signed-out visitor, Ada and
 * Grace: any method, each path with each record it may name, the path spelled
 * other ways, and bodies, queries and headers a browser or an attacker sends.
 * Whatever arrives, each answer keeps the framework's rules (no 500, another
 * site's write refused, a signed-in page never kept by a shared cache, ...),
 * no one sees another writer's drafts or session, no one but its writer
 * changes a post, a blog, a writer or a session, and a refused request
 * writes nothing.
 *
 * The forms come from the routes: an action that takes `form(Schema)` is
 * sent fields that pass it, so a new one is fuzzed once it is registered. A
 * new placeholder in src/paths.ts is a type error at `params` until it is
 * given values here.
 */
import { expect, test } from 'bun:test'
import { Redacted } from 'effect'
import {
  brokenPromises,
  fuzz,
  fuzzRequest,
  fuzzTimeout,
  leaks,
  ownership,
  refusedWrites,
  sendFuzzRequest,
  strangerWrites,
  type FuzzRequest,
  type Refusal,
  type RowKeys,
  type RowsChange,
} from '@popcomputer/web/fuzz'
import { signedIn, testEnv } from '@popcomputer/web/testing'
import { routes } from '../src/app'
import { createDb } from '../src/db'
import { paths } from '../src/paths'
import { account, blogs, posts, rateLimit, session, user, verification } from '../src/schema'
import { app, freshBindings } from './app'
import { databases } from './databases'

// Text only each writer's private records hold: an answer that shows it to
// anyone else leaked it. A draft is its writer's alone until it's published;
// a session's token is shown to no one, its writer included, but these
// check only the others.
const canaries = {
  ada: { draft: 'canary-ada-draft-7f3a', token: 'token-ada-0c51' },
  grace: { draft: 'canary-grace-draft-91c2', token: 'token-grace-5e8d' },
}

const since = new Date(Date.UTC(2026, 0, 1))
const until = new Date(Date.UTC(2100, 0, 1))

const writer = (id: 'ada' | 'grace', name: string) => ({
  user: {
    id,
    name,
    email: `${id}@example.com`,
    emailVerified: false,
    image: null,
    createdAt: since,
    updatedAt: since,
    isAnonymous: true,
  },
  session: {
    id: `s-${id}`,
    userId: id,
    token: canaries[id].token,
    expiresAt: until,
    createdAt: since,
    updatedAt: since,
    ipAddress: null,
    userAgent: null,
  },
  blog: { id: `b-${id}`, userId: id, slug: `${id}-notes`, title: `${name}’s notes`, description: null, createdAt: since, updatedAt: since },
  // A published post and a draft each, under the same slugs in both blogs,
  // so a post that loaded outside its blog would show.
  posts: [
    {
      id: `p-${id}-live`,
      blogId: `b-${id}`,
      userId: id,
      slug: 'hello',
      title: `Hello from ${name}`,
      excerpt: null,
      body: 'Anyone may read this.',
      status: 'published' as const,
      publishedAt: since,
      createdAt: since,
      updatedAt: since,
    },
    {
      id: `p-${id}-draft`,
      blogId: `b-${id}`,
      userId: id,
      slug: 'secret-draft',
      title: canaries[id].draft,
      excerpt: canaries[id].draft,
      body: canaries[id].draft,
      status: 'draft' as const,
      publishedAt: null,
      createdAt: since,
      updatedAt: since,
    },
  ],
})

const people = { ada: writer('ada', 'Ada'), grace: writer('grace', 'Grace') }

type Person = keyof typeof people

/** A writer as the request sees them signed in: the session's token is Redacted there. */
const signedInAs = (person: Person) => {
  const { user, session } = people[person]

  return { user, session: { ...session, token: Redacted.make(session.token) } }
}

const requests = fuzzRequest({
  paths,
  routes,
  // Each writer's posts and blog, under their ids and slugs, and a missing one.
  params: {
    post: ['p-ada-live', 'p-ada-draft', 'p-grace-live', 'p-grace-draft', 'missing'],
    blog: ['ada-notes', 'grace-notes', 'missing'],
    publicPost: ['hello', 'secret-draft', 'missing'],
  },
  people: ['ada', 'grace'],
})

/**
 * How many cases were answered, rendered a page, started the demo, created,
 * changed or deleted a post, and renamed a blog. An app that refuses
 * everything keeps every rule, so each must happen: a failed form's 303 back
 * reaches nothing.
 */
const reached = { cases: 0, rendered: 0, started: 0, created: 0, changed: 0, deleted: 0, renamed: 0 }

/** What a request did to a table: rows added, changed and removed, by id. */
function writesTo(change: RowsChange<{ readonly id: string }>) {
  const was = new Map(change.before.map((row) => [row.id, JSON.stringify(row)]))
  const now = new Map(change.after.map((row) => [row.id, JSON.stringify(row)]))

  return {
    created: [...now.keys()].filter((id) => !was.has(id)).length,
    changed: [...now].filter(([id, row]) => was.has(id) && was.get(id) !== row).length,
    deleted: [...was.keys()].filter((id) => !now.has(id)).length,
  }
}

/** A row the user it names owns: a blog, a session, or the user itself. */
const ownedBy = <Row extends { readonly id: string }>(owner: (row: Row) => string): RowKeys<Row> => ({ id: (row) => row.id, owner })

/**
 * A visitor who starts the demo becomes a guest of their own, with a blog
 * and sample posts: the rows written for the guest the request created are
 * the sender's, not a stranger's. Only a signed-out visitor may start one,
 * and it makes one guest.
 */
function startedDemo(sent: FuzzRequest<Person>, newcomers: ReadonlyArray<{ readonly id: string; readonly isAnonymous: boolean }>): string[] {
  if (newcomers.length === 0) return []
  if (sent.person !== null) return [`${sent.person} made the users ${newcomers.map((row) => row.id).join(', ')}`]
  if (newcomers.length > 1) return [`a visitor made ${newcomers.length} guests`]

  return newcomers.filter((row) => !row.isAnonymous).map((row) => `a visitor made ${row.id}, who is no guest`)
}

/**
 * Each case's client address, as Cloudflare names it. Better Auth keeps its
 * own limits by address in the process's memory, past the case's database,
 * so cases sent from one address would share three demo starts each ten
 * seconds, and whether a case started one would hang on the cases before it.
 */
let sentFrom = 0
const nextAddress = () => {
  sentFrom += 1
  return `10.${(sentFrom >> 16) & 255}.${(sentFrom >> 8) & 255}.${sentFrom & 255}`
}

// One database for every case, emptied as each starts: a new one takes several
// times what a request does. Each case still gets bindings of its own, with
// their sign-in limiter, from freshBindings().
let shared: Awaited<ReturnType<typeof databases.fresh>> | undefined

/** The rows every case starts from. */
const seeded = {
  users: [people.ada.user, people.grace.user],
  sessions: [people.ada.session, people.grace.session],
  blogs: [people.ada.blog, people.grace.blog],
  posts: [...people.ada.posts, ...people.grace.posts],
}

/** Rows in the order of their ids, as a read ordered by id returns them. */
const byId = <Row extends { readonly id: string }>(rows: ReadonlyArray<Row>) => [...rows].sort((left, right) => (left.id < right.id ? -1 : 1))

/** The seeded rows as send()'s reads return them: the same columns, in the same order. */
const seededRows = {
  users: byId(seeded.users).map(({ id, name, isAnonymous }) => ({ id, name, isAnonymous })),
  sessions: byId(seeded.sessions).map(({ id, userId, expiresAt }) => ({ id, userId, expiresAt })),
  blogs: byId(seeded.blogs).map(({ id, userId, slug, title, description }) => ({ id, userId, slug, title, description })),
  posts: byId(seeded.posts).map(({ id, blogId, userId, slug, title, body, status }) => ({ id, blogId, userId, slug, title, body, status })),
}

async function send(sent: FuzzRequest<Person>): Promise<Refusal> {
  shared ??= await databases.fresh()
  const bindings = await freshBindings(shared)
  const db = createDb(bindings.DB)

  // Emptied as the case starts, not as it ends, so a case that throws leaves
  // the next nothing: every table, each before the ones its rows name, then
  // the rows a case starts from, all in one batch.
  await db.batch([
    db.delete(posts),
    db.delete(blogs),
    db.delete(session),
    db.delete(account),
    db.delete(verification),
    db.delete(rateLimit),
    db.delete(user),
    db.insert(user).values(seeded.users),
    db.insert(session).values(seeded.sessions),
    db.insert(blogs).values(seeded.blogs),
    db.insert(posts).values(seeded.posts),
  ])

  const userRows = () => db.select({ id: user.id, name: user.name, isAnonymous: user.isAnonymous }).from(user).orderBy(user.id)
  const sessionRows = () =>
    db.select({ id: session.id, userId: session.userId, expiresAt: session.expiresAt }).from(session).orderBy(session.id)
  const blogRows = () =>
    db.select({ id: blogs.id, userId: blogs.userId, slug: blogs.slug, title: blogs.title, description: blogs.description }).from(blogs).orderBy(blogs.id)
  const postRows = () =>
    db
      .select({ id: posts.id, blogId: posts.blogId, userId: posts.userId, slug: posts.slug, title: posts.title, body: posts.body, status: posts.status })
      .from(posts)
      .orderBy(posts.id)

  // What the batch just wrote, without asking the database again.
  const before = seededRows
  const env = sent.person === null ? testEnv(bindings) : testEnv(signedIn(signedInAs(sent.person)), bindings)
  const answer = await sendFuzzRequest(app, { ...sent, headers: { ...sent.headers, 'cf-connecting-ip': nextAddress() } }, env)

  // A request fetch refuses to make never reaches the Worker.
  if (answer === undefined) return undefined

  const after = { users: await userRows(), sessions: await sessionRows(), blogs: await blogRows(), posts: await postRows() }
  const newcomers = after.users.filter((row) => !before.users.some((was) => was.id === row.id))
  const theirs = <Row extends { readonly userId: string }>(rows: ReadonlyArray<Row>) =>
    rows.filter((row) => !newcomers.some((newcomer) => newcomer.id === row.userId))
  const changes = {
    users: { before: before.users, after: after.users.filter((row) => !newcomers.includes(row)) },
    sessions: { before: before.sessions, after: theirs(after.sessions) },
    blogs: { before: before.blogs, after: theirs(after.blogs) },
    posts: { before: before.posts, after: theirs(after.posts) },
  }
  const postWrites = writesTo({ before: before.posts, after: after.posts })

  reached.cases += 1
  if (answer.response.status === 200) reached.rendered += 1
  if (newcomers.length > 0) reached.started += 1
  else {
    if (postWrites.created > 0) reached.created += 1
    if (postWrites.changed > 0) reached.changed += 1
    if (postWrites.deleted > 0) reached.deleted += 1
    if (writesTo(changes.blogs).changed > 0) reached.renamed += 1
  }

  const broken = [
    ...brokenPromises(sent, answer),
    ...leaks(sent, answer, { ada: Object.values(canaries.ada), grace: Object.values(canaries.grace) }),
    ...startedDemo(sent, newcomers),
    ...strangerWrites(sent, changes.posts, ownership(routes, 'posts')),
    ...strangerWrites(sent, changes.blogs, ownedBy((row) => row.userId)),
    ...strangerWrites(sent, changes.sessions, ownedBy((row) => row.userId)),
    ...strangerWrites(sent, changes.users, ownedBy((row) => row.id)),
    ...refusedWrites(answer, { before: before.posts, after: after.posts }),
    ...refusedWrites(answer, { before: before.blogs, after: after.blogs }),
    ...refusedWrites(answer, { before: before.sessions, after: after.sessions }),
    ...refusedWrites(answer, { before: before.users, after: after.users }),
  ]

  return broken.length === 0 ? undefined : `${sent.method} ${sent.path}: ${broken.join('; ')}`
}

test('any request keeps the rules, and the editor’s forms and the demo reach their actions', async () => {
  await fuzz(requests, send, { runs: 200 })

  // A replay runs one case; a full run must have done each.
  if (reached.cases < 100) return

  expect(Object.entries(reached).filter(([, count]) => count === 0).map(([what]) => what)).toEqual([])
}, fuzzTimeout)
