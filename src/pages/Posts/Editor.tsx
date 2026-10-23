import { Head, Link, useForm } from '@inertiajs/react'
import { href } from '@popcomputer/web/paths'
import type { FormInput, WebPage } from '@popcomputer/web/react'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import { buttonClassName } from '~/components/button'
import { cn } from '~/components/cn'
import DangerZone from '~/components/DangerZone'
import FieldError from '~/components/FieldError'
import { fieldControlClassName, fieldHintClassName, fieldLabelClassName } from '~/components/fieldStyles'
import { formatDate } from '~/components/format'
import Layout from '~/components/Layout'
import Markdown from '~/components/Markdown'
import StatusBadge from '~/components/StatusBadge'
import UnderTheHood, { Guarantee } from '~/components/UnderTheHood'
import type { PostForm } from '~/forms'
import { paths } from '~/paths'
import { readingMinutes, slugify, wordCount } from '~/text'

type Fields = FormInput<typeof PostForm>
type Status = Fields['status']

/** Writes a new post, or changes one: Markdown on one side, what readers will see on the other. */
const Editor: WebPage<'Posts/Editor'> = ({ blog, post }) => {
  const { data, setData, transform, post: create, put, processing, errors, clearErrors, isDirty } = useForm<Fields>({
    title: post?.title ?? '',
    slug: post?.slug ?? '',
    excerpt: post?.excerpt ?? '',
    body: post?.body ?? '',
    status: post?.status ?? 'draft',
  })
  // A new post's address follows its title until the writer changes it.
  const [slugFollowsTitle, setSlugFollowsTitle] = useState(post === null)
  const [view, setView] = useState<'write' | 'preview'>('write')
  const form = useRef<HTMLFormElement>(null)
  const published = post?.status === 'published'

  function save(status: Status) {
    transform((fields) => ({ ...fields, status }))
    const options = { preserveScroll: true }
    if (post === null) create(paths.posts, options)
    else put(href(paths.post, { post: post.id }), options)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // The button pressed says which; Cmd-S, with none, keeps the post as it is.
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    const chosen = submitter instanceof HTMLButtonElement ? submitter.value : ''
    save(chosen === 'draft' || chosen === 'published' ? chosen : data.status)
  }

  // Cmd-S or Ctrl-S saves, keeping the post as it is: a draft stays one.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        form.current?.requestSubmit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const words = wordCount(data.body)
  const publicPath = href(paths.publicPost, { blog: blog.slug, publicPost: post?.slug ?? (data.slug || 'your-post') })

  return (
    <>
      <Head title={post === null ? 'New post' : `Edit “${post.title}”`} />
      <Layout blogSlug={blog.slug}>
        <form ref={form} noValidate onSubmit={submit} className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={paths.dashboard}
              className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-zinc-600 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-rose-600 dark:text-zinc-400 dark:hover:text-white"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              All posts
            </Link>
            {post === null ? null : <StatusBadge status={post.status} />}
            {isDirty ? <span className="text-sm text-amber-700 dark:text-amber-400">Unsaved changes</span> : null}
            <div className="ml-auto flex flex-wrap gap-2">
              {published ? (
                <a href={publicPath} className={buttonClassName({ variant: 'ghost' })}>
                  View post
                  <ExternalLink aria-hidden="true" />
                </a>
              ) : null}
              <button type="submit" name="status" value="draft" disabled={processing} className={buttonClassName({ variant: 'secondary' })}>
                {published ? 'Take down' : 'Save draft'}
              </button>
              <button type="submit" name="status" value="published" disabled={processing} className={buttonClassName()}>
                {published ? 'Update' : 'Publish'}
              </button>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="title" className="sr-only">
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  autoFocus={post === null}
                  maxLength={120}
                  placeholder="Title"
                  value={data.title}
                  className="w-full border-0 bg-transparent p-0 font-serif text-3xl font-semibold tracking-tight placeholder:text-zinc-300 focus:ring-0 focus:outline-none sm:text-4xl dark:placeholder:text-zinc-700"
                  aria-invalid={errors.title ? true : undefined}
                  aria-describedby={errors.title ? 'title-error' : undefined}
                  onChange={(event) => {
                    const title = event.target.value
                    setData((fields) => ({ ...fields, title, slug: slugFollowsTitle ? slugify(title) : fields.slug }))
                    clearErrors('title')
                  }}
                />
                <FieldError id="title-error" message={errors.title} />
              </div>

              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div role="tablist" aria-label="Body" className="flex items-center gap-1 border-b border-zinc-200 px-2 py-1.5 dark:border-zinc-800">
                  {(['write', 'preview'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="tab"
                      aria-selected={view === option}
                      aria-controls={`body-${option}`}
                      onClick={() => setView(option)}
                      className="h-8 rounded-md px-3 text-sm font-medium text-zinc-500 capitalize hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-rose-600 aria-selected:bg-zinc-100 aria-selected:text-zinc-950 dark:text-zinc-400 dark:hover:text-white dark:aria-selected:bg-zinc-800 dark:aria-selected:text-white"
                    >
                      {option}
                    </button>
                  ))}
                  <span className="ml-auto px-2 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                    {words.toLocaleString()} words · {readingMinutes(data.body)} min read
                  </span>
                </div>
                {view === 'write' ? (
                  <div id="body-write" role="tabpanel">
                    <label htmlFor="body" className="sr-only">
                      Body, in Markdown
                    </label>
                    <textarea
                      id="body"
                      name="body"
                      value={data.body}
                      rows={22}
                      maxLength={50_000}
                      placeholder={'Write in Markdown: ## for a heading, **bold**, - for a list…'}
                      className="block w-full resize-y border-0 bg-transparent px-4 py-3 font-mono text-sm leading-relaxed focus:ring-0 focus:outline-none"
                      aria-invalid={errors.body ? true : undefined}
                      aria-describedby={errors.body ? 'body-error' : undefined}
                      onChange={(event) => {
                        setData('body', event.target.value)
                        clearErrors('body')
                      }}
                    />
                  </div>
                ) : (
                  <div id="body-preview" role="tabpanel" className="min-h-[33rem] px-5 py-4">
                    {data.body.trim() === '' ? (
                      <p className="text-sm text-zinc-500">Nothing to preview yet.</p>
                    ) : (
                      <Markdown className="font-serif prose-headings:font-sans">{data.body}</Markdown>
                    )}
                  </div>
                )}
              </div>
              <FieldError id="body-error" message={errors.body} />
            </div>

            <aside className="flex flex-col gap-6" aria-label="Post settings">
              <div className="flex flex-col gap-2">
                <label htmlFor="slug" className={fieldLabelClassName}>
                  Address
                </label>
                <div className="flex items-center overflow-hidden rounded-md border border-zinc-300 bg-white shadow-xs focus-within:border-zinc-950 focus-within:outline-2 focus-within:outline-zinc-950/10 has-aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-zinc-300">
                  <span className="pl-3 text-sm text-zinc-500 select-none">/b/{blog.slug}/</span>
                  <input
                    id="slug"
                    name="slug"
                    maxLength={80}
                    value={data.slug}
                    spellCheck={false}
                    className="h-10 min-w-0 flex-1 border-0 bg-transparent pr-3 text-sm focus:ring-0 focus:outline-none"
                    aria-invalid={errors.slug ? true : undefined}
                    aria-describedby={['slug-hint', errors.slug ? 'slug-error' : ''].join(' ').trim()}
                    onChange={(event) => {
                      setSlugFollowsTitle(false)
                      setData('slug', event.target.value)
                      clearErrors('slug')
                    }}
                  />
                </div>
                <p id="slug-hint" className={fieldHintClassName}>
                  {published ? 'Changing it moves the post: the old address stops working.' : 'Lowercase letters, digits and dashes.'}
                </p>
                <FieldError id="slug-error" message={errors.slug} />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="excerpt" className={fieldLabelClassName}>
                    Excerpt
                  </label>
                  <span className={fieldHintClassName}>Optional</span>
                </div>
                <textarea
                  id="excerpt"
                  name="excerpt"
                  rows={4}
                  maxLength={300}
                  value={data.excerpt ?? ''}
                  className={cn(fieldControlClassName, 'py-2')}
                  aria-invalid={errors.excerpt ? true : undefined}
                  aria-describedby={['excerpt-hint', errors.excerpt ? 'excerpt-error' : ''].join(' ').trim()}
                  onChange={(event) => {
                    setData('excerpt', event.target.value)
                    clearErrors('excerpt')
                  }}
                />
                <p id="excerpt-hint" className={fieldHintClassName}>
                  The blog’s list and the RSS feed show it. Without one, they show the first paragraph.
                </p>
                <FieldError id="excerpt-error" message={errors.excerpt} />
              </div>

              {post?.publishedAt ? (
                <p className={fieldHintClassName}>First published {formatDate(post.publishedAt)}.</p>
              ) : null}

              {post === null ? null : (
                <DangerZone
                  label="Delete post"
                  name={post.title}
                  description="The post goes for good, from the editor and from your blog."
                  path={href(paths.post, { post: post.id })}
                />
              )}
            </aside>
          </div>
        </form>

        <UnderTheHood route={post === null ? 'POST /posts' : 'PUT /posts/{post}'} action={post === null ? 'createPost' : 'updatePost'}>
          <Guarantee>
            A save purges the post’s cached pages by their Cache-Tags, <code>posts:{'{id}'}</code> and the blog’s list,
            so readers see it at once.
          </Guarantee>
          <Guarantee>
            The address is unique within your blog, by a unique index: a clash shows beside the field, not as an error
            page.
          </Guarantee>
          <Guarantee>
            The preview renders Markdown as readers will see it. Raw HTML stays text, so a post can’t run a script.
          </Guarantee>
        </UnderTheHood>
      </Layout>
    </>
  )
}

export default Editor
