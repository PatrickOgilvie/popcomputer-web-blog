import { eq } from 'drizzle-orm'
import { DateTime, Effect } from 'effect'
import { action, dbMutation, flash, purgeCache, recordCacheTag, redirect, render, uniqueFieldErrors, validateRequest } from '@popcomputer/web/effect'
import { BlogForm } from '../forms'
import { paths } from '../paths'
import { blogs } from '../schema'
import { writersBlog } from './shared'

export const showSettings = action(
  Effect.gen(function* () {
    const { blog } = yield* writersBlog
    return yield* render('Settings', { blog })
  })
)

/** Renames the blog, or moves it: every page of it is purged, since each shows its title. */
export const updateSettings = action(
  Effect.gen(function* () {
    const { blog } = yield* writersBlog
    const input = yield* validateRequest(BlogForm)
    const now = DateTime.toDateUtc(yield* DateTime.now)

    yield* dbMutation((db) => db.update(blogs).set({ ...input, updatedAt: now }).where(eq(blogs.id, blog.id))).pipe(
      uniqueFieldErrors({ slug: 'Another blog has this address.' })
    )
    yield* purgeCache(recordCacheTag('blogs', blog.id))
    yield* flash('success', 'Settings saved.')

    return yield* redirect(paths.settings)
  })
)
