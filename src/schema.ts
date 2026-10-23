import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { user } from './auth-schema'
import { PostStatus } from './forms'

export * from './auth-schema'

const createdAt = () => integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date())
const updatedAt = () => integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date())

/** Each writer's one blog, at /b/{slug}. */
export const blogs = sqliteTable(
  'blogs',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: text('description'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check('blogs_slug_format', sql`length(${table.slug}) BETWEEN 3 AND 40 AND ${table.slug} NOT GLOB '*[^a-z0-9-]*'`),
    check('blogs_title_length', sql`length(${table.title}) BETWEEN 1 AND 80`),
    check('blogs_description_length', sql`${table.description} IS NULL OR length(${table.description}) <= 200`),
  ]
)

/**
 * A blog's posts, in Markdown. Readers see a post only once it's published;
 * its writer sees all of theirs. userId repeats the blog's writer, so the
 * editor's binding can say whose a post is, and a trigger keeps the two the same.
 */
export const posts = sqliteTable(
  'posts',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    blogId: text('blog_id').notNull().references(() => blogs.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    excerpt: text('excerpt'),
    body: text('body').notNull().default(''),
    status: text('status', { enum: PostStatus.literals }).notNull().default('draft'),
    // Set the first time a post is published, and kept if it's taken down and put back.
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('posts_blog_slug_unique').on(table.blogId, table.slug),
    index('posts_blog_published_idx').on(table.blogId, table.status, table.publishedAt),
    index('posts_user_updated_idx').on(table.userId, table.updatedAt),
    check('posts_slug_format', sql`length(${table.slug}) BETWEEN 1 AND 80 AND ${table.slug} NOT GLOB '*[^a-z0-9-]*'`),
    check('posts_title_length', sql`length(${table.title}) BETWEEN 1 AND 120`),
    check('posts_excerpt_length', sql`${table.excerpt} IS NULL OR length(${table.excerpt}) <= 300`),
    check('posts_body_length', sql`length(${table.body}) <= 50000`),
    check('posts_status', sql`${table.status} IN ('draft', 'published')`),
    check('posts_published_at', sql`${table.status} = 'draft' OR ${table.publishedAt} IS NOT NULL`),
  ]
)
