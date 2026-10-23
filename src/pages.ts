// Each page's props, as the Effect Schema `render` checks and encodes them
// with: a column the schema does not name never reaches the browser.
import { Schema as S, Struct } from 'effect'
import { tableSchema } from '@popcomputer/web/schema'
import * as schema from './schema'

export const Blog = tableSchema(schema.blogs).mapFields(Struct.pick(['id', 'slug', 'title', 'description']))

export const PublicBlog = tableSchema(schema.blogs).mapFields(Struct.pick(['slug', 'title', 'description']))

export const PostSummary = tableSchema(schema.posts).mapFields((fields) => ({
  ...Struct.pick(fields, ['id', 'slug', 'title', 'status', 'publishedAt', 'updatedAt']),
  words: S.Number,
}))

export const Post = tableSchema(schema.posts).mapFields(
  Struct.pick(['id', 'slug', 'title', 'excerpt', 'body', 'status', 'publishedAt', 'updatedAt'])
)

/** A published post in its blog's list: its excerpt, or its first paragraph. */
export const PublishedSummary = tableSchema(schema.posts).mapFields((fields) => ({
  ...Struct.pick(fields, ['slug', 'title', 'publishedAt']),
  excerpt: S.String,
  readingMinutes: S.Number,
}))

export const PublishedPost = tableSchema(schema.posts).mapFields((fields) => ({
  ...Struct.pick(fields, ['slug', 'title', 'excerpt', 'body', 'publishedAt', 'updatedAt']),
  readingMinutes: S.Number,
}))

export const pages = {
  'Auth/Login': S.Struct({}),
  'Posts/Index': S.Struct({ blog: Blog, posts: S.Array(PostSummary) }),
  'Posts/Editor': S.Struct({ blog: Blog, post: S.NullOr(Post) }),
  Settings: S.Struct({ blog: Blog }),
  'Blog/Index': S.Struct({ blog: PublicBlog, posts: S.Array(PublishedSummary) }),
  'Blog/Post': S.Struct({ blog: PublicBlog, post: PublishedPost }),
}
