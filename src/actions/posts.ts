import { and, desc, eq } from 'drizzle-orm'
import { DateTime, Effect } from 'effect'
import {
  action,
  bound,
  dbMutation,
  dbQuery,
  flash,
  purgeCache,
  redirect,
  render,
  validateRequest,
} from '@popcomputer/web/effect'
import { PostForm } from '../forms'
import { paths } from '../paths'
import { posts } from '../schema'
import { wordCount } from '../text'
import { blogPostsTag, postSlugTaken, writersBlog } from './shared'

/** The editor's home: the writer's blog and all their posts, drafts too, newest change first. */
export const listPosts = action(
  Effect.gen(function* () {
    const { blog } = yield* writersBlog
    const rows = yield* dbQuery((db) =>
      db.select().from(posts).where(eq(posts.blogId, blog.id)).orderBy(desc(posts.updatedAt))
    )

    return yield* render('Posts/Index', {
      blog,
      posts: rows.map((post) => ({ ...post, words: wordCount(post.body) })),
    })
  })
)

export const newPost = action(
  Effect.gen(function* () {
    const { blog } = yield* writersBlog
    return yield* render('Posts/Editor', { blog, post: null })
  })
)

const savedMessage = (status: 'draft' | 'published', was: 'draft' | 'published' | null) =>
  status === 'draft' ? (was === 'published' ? 'Taken down: it’s a draft again.' : 'Draft saved.') : was === 'published' ? 'Saved.' : 'Published.'

/** Writes a new post into the writer's blog, as a draft or published. */
export const createPost = action(
  Effect.gen(function* () {
    const { auth, blog } = yield* writersBlog
    const input = yield* validateRequest(PostForm)
    const now = DateTime.toDateUtc(yield* DateTime.now)
    const id = crypto.randomUUID()

    yield* dbMutation((db) =>
      db.insert(posts).values({
        id,
        blogId: blog.id,
        userId: auth.user.id,
        ...input,
        publishedAt: input.status === 'published' ? now : null,
        createdAt: now,
        updatedAt: now,
      })
    ).pipe(postSlugTaken)
    yield* purgeCache(blogPostsTag(blog.id))
    yield* flash('success', savedMessage(input.status, null))

    return yield* redirect(paths.editPost, { post: id })
  })
)

export const editPost = action(
  Effect.gen(function* () {
    const { blog } = yield* writersBlog
    // Its writer's only: the binding is ownedBy 'userId'.
    const post = yield* bound('post')
    return yield* render('Posts/Editor', { blog, post })
  })
)

/**
 * Saves a post. Publishing it the first time dates it; taking it down keeps
 * the date, so putting it back keeps its place. The route purges the post's
 * cached pages, and this the blog's list.
 */
export const updatePost = action(
  Effect.gen(function* () {
    const post = yield* bound('post')
    const input = yield* validateRequest(PostForm)
    const now = DateTime.toDateUtc(yield* DateTime.now)

    yield* dbMutation((db) =>
      db
        .update(posts)
        .set({ ...input, publishedAt: input.status === 'published' ? (post.publishedAt ?? now) : post.publishedAt, updatedAt: now })
        .where(and(eq(posts.id, post.id), eq(posts.userId, post.userId)))
    ).pipe(postSlugTaken)
    yield* purgeCache(blogPostsTag(post.blogId))
    yield* flash('success', savedMessage(input.status, post.status))

    return yield* redirect(paths.editPost, { post: post.id })
  })
)

export const deletePost = action(
  Effect.gen(function* () {
    const post = yield* bound('post')

    yield* dbMutation((db) => db.delete(posts).where(and(eq(posts.id, post.id), eq(posts.userId, post.userId))))
    yield* purgeCache(blogPostsTag(post.blogId))
    yield* flash('success', `Deleted “${post.title}”.`)

    return yield* redirect(paths.dashboard)
  })
)
