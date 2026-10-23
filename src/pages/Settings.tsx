import { Head, useForm } from '@inertiajs/react'
import type { FormInput, WebPage } from '@popcomputer/web/react'
import type { FormEvent } from 'react'

import { buttonClassName } from '~/components/button'
import { cn } from '~/components/cn'
import FieldError from '~/components/FieldError'
import { fieldControlClassName, fieldHintClassName, fieldLabelClassName } from '~/components/fieldStyles'
import Layout from '~/components/Layout'
import PageHeader from '~/components/PageHeader'
import TextField from '~/components/TextField'
import UnderTheHood, { Guarantee } from '~/components/UnderTheHood'
import type { BlogForm } from '~/forms'
import { paths } from '~/paths'

/** The blog's name, its line under the name, and its address. */
const Settings: WebPage<'Settings'> = ({ blog }) => {
  const { data, setData, put, processing, errors, clearErrors, isDirty } = useForm<FormInput<typeof BlogForm>>({
    title: blog.title,
    description: blog.description ?? '',
    slug: blog.slug,
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    put(paths.settings, { preserveScroll: true })
  }

  return (
    <>
      <Head title="Settings" />
      <Layout blogSlug={blog.slug}>
        <PageHeader title="Settings" description="What readers see at the top of every page of your blog, and where they find it." />
        <form noValidate onSubmit={submit} className="flex max-w-xl flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <TextField
            label="Name"
            name="title"
            maxLength={80}
            required
            value={data.title}
            error={errors.title}
            onChange={(event) => {
              setData('title', event.target.value)
              clearErrors('title')
            }}
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <label htmlFor="description" className={fieldLabelClassName}>
                Description
              </label>
              <span className={fieldHintClassName}>Optional</span>
            </div>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={200}
              value={data.description ?? ''}
              className={cn(fieldControlClassName, 'py-2')}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? 'description-error' : undefined}
              onChange={(event) => {
                setData('description', event.target.value)
                clearErrors('description')
              }}
            />
            <FieldError id="description-error" message={errors.description} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="slug" className={fieldLabelClassName}>
              Address
            </label>
            <div className="flex items-center overflow-hidden rounded-md border border-zinc-300 bg-white shadow-xs focus-within:border-zinc-950 focus-within:outline-2 focus-within:outline-zinc-950/10 has-aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-zinc-300">
              <span className="pl-3 text-sm text-zinc-500 select-none">/b/</span>
              <input
                id="slug"
                name="slug"
                maxLength={40}
                spellCheck={false}
                value={data.slug}
                className="h-10 min-w-0 flex-1 border-0 bg-transparent pr-3 text-sm focus:ring-0 focus:outline-none"
                aria-invalid={errors.slug ? true : undefined}
                aria-describedby={['slug-hint', errors.slug ? 'slug-error' : ''].join(' ').trim()}
                onChange={(event) => {
                  setData('slug', event.target.value)
                  clearErrors('slug')
                }}
              />
            </div>
            <p id="slug-hint" className={fieldHintClassName}>
              Changing it moves the whole blog: links to the old address stop working.
            </p>
            <FieldError id="slug-error" message={errors.slug} />
          </div>
          <div>
            <button type="submit" disabled={processing || !isDirty} className={buttonClassName()}>
              {processing ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </form>

        <UnderTheHood route="PUT /settings" action="updateSettings">
          <Guarantee>
            Every page of the blog carries its Cache-Tag, <code>blogs:{'{id}'}</code>, so a new name purges them all at
            once.
          </Guarantee>
          <Guarantee>An address another blog has shows beside the field, from the database’s unique index.</Guarantee>
          <Guarantee>The blog is read from your session: no form names whose blog it changes.</Guarantee>
        </UnderTheHood>
      </Layout>
    </>
  )
}

export default Settings
