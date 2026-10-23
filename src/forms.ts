// The fields each form sends, which its action validates and its page types
// its form with. The browser imports this module only with `import type`.
import { Schema as S } from 'effect'
import { max, nullable, requiredString } from '@popcomputer/web/schema'

export const PostStatus = S.Literals(['draft', 'published'])

/** The part of a page's address a writer chooses: `my-first-post`. */
const slug = (most: number) =>
  requiredString.check(
    S.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Use lowercase letters, digits and single dashes.' }),
    S.isMaxLength(most, { message: `Use at most ${most} characters.` })
  )

export const PostForm = S.Struct({
  title: requiredString.check(S.isMaxLength(120, { message: 'Use at most 120 characters.' })),
  slug: slug(80),
  excerpt: nullable(max(300, 'Use at most 300 characters.')),
  // Markdown. A draft may be empty.
  body: S.String.check(S.isMaxLength(50_000, { message: 'Use at most 50,000 characters.' })),
  status: PostStatus,
})

export const BlogForm = S.Struct({
  title: requiredString.check(S.isMaxLength(80, { message: 'Use at most 80 characters.' })),
  description: nullable(max(200, 'Use at most 200 characters.')),
  slug: slug(40).check(S.isMinLength(3, { message: 'Use at least 3 characters.' })),
})
