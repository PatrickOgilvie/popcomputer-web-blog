import { eq } from 'drizzle-orm'
import { Effect } from 'effect'
import { authorize, dbQuery, notFound, uniqueFieldErrors } from '@popcomputer/web/effect'
import { blogs } from '../schema'

/** The signed-in writer and their blog, which they got when they started the demo. */
export const writersBlog = Effect.gen(function* () {
  const auth = yield* authorize()
  const [blog] = yield* dbQuery((db) => db.select().from(blogs).where(eq(blogs.userId, auth.user.id)))
  if (blog === undefined) return yield* notFound('You have no blog yet.')
  return { auth, blog }
})

/** A slug another post of the same blog has, beside its field. */
export const postSlugTaken = uniqueFieldErrors(
  { slug: 'Another of your posts has this address.' },
  { constraints: { 'blog_id,slug': 'slug' } }
)

/** The tag of a blog's list of posts, which every write to its posts purges. */
export const blogPostsTag = (blogId: string) => `posts:blog-${blogId}` as const
