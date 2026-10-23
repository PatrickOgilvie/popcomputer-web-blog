import { Head, useForm, usePage } from '@inertiajs/react'
import type { FormEvent } from 'react'

import AuthShell from '~/components/AuthShell'
import { buttonClassName } from '~/components/button'
import { Guarantee } from '~/components/UnderTheHood'
import { paths } from '~/paths'

/** The way in: one button that signs the visitor in as a guest, with a blog of their own. */
export default function Login() {
  const { errors } = usePage().props
  const { post, processing } = useForm({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    post(paths.login)
  }

  return (
    <>
      <Head title="Start writing" />
      <AuthShell
        title="A blog, with a CMS behind it"
        description="One click signs you in as a guest with a blog of your own: three posts published, a draft, and an editor to change them. No email, no password."
        footnote="Guests, their blogs and their posts are deleted after a week."
        route="POST /login"
        action="startDemo"
        guarantees={
          <>
            <Guarantee>
              Better Auth’s anonymous plugin makes the guest, through its own handler, so the sign-in limits count it
              by address.
            </Guarantee>
            <Guarantee>Your blog and its posts are written in one dbBatch as you sign in: all of it, or none.</Guarantee>
          </>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {typeof errors.form === 'string' ? (
            <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-pretty text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              {errors.form}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={processing}
            aria-busy={processing}
            className={buttonClassName({ className: 'h-11 w-full text-base' })}
          >
            <span aria-live="polite">{processing ? 'Starting…' : 'Start writing'}</span>
          </button>
        </form>
      </AuthShell>
    </>
  )
}
