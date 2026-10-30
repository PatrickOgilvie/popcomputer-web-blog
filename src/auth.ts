import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous } from 'better-auth/plugins'
import type { Database } from './db'
import { guestName } from './guests'
import * as schema from './schema'

export interface CreateAuthOptions {
  readonly db: Database
  readonly secret: string
  /** The app's own origin: APP_URL, never the request's URL. */
  readonly baseURL: string
  readonly advanced?: BetterAuthOptions['advanced']
  readonly logger?: BetterAuthOptions['logger']
}

/** Better Auth's messages, without "Invalid password": a mistyped password is routine. */
const log: NonNullable<BetterAuthOptions['logger']>['log'] = (level, message, ...args) => {
  if (message === 'Invalid password') return
  const write = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  write(`[Better Auth] ${message}`, ...args)
}

export function createAuth(options: CreateAuthOptions) {
  return betterAuth({
    database: drizzleAdapter(options.db, { provider: 'sqlite', schema }),
    secret: options.secret,
    baseURL: options.baseURL,
    // Better Auth trusts forms from baseURL alone. Trusting the page's own
    // address too, as setupWeb's cross-site check does, lets a visitor start
    // the demo at a Version URL `bun run preview` shares.
    trustedOrigins: (request) => (request === undefined ? [] : [new URL(request.url).origin]),
    // A demo: visitors sign in as guests, with no email or password, and
    // nobody registers. The anonymous plugin makes each guest's account.
    // Turning passwords on takes the framework's docs/auth.md "Proving an
    // address" first, so a sign-up signs no one in until its emailed link's
    // page posts the token.
    emailAndPassword: { enabled: false },
    plugins: [anonymous({ generateName: guestName })],
    logger: { log, ...options.logger },
    // setupWeb's auth.signInLimits limits signing in, up and every password
    // call by address and account. Better Auth's own limits stay on too, in
    // each isolate's memory, writing nothing.
    rateLimit: { enabled: true, storage: 'memory' },
    advanced: {
      ...options.advanced,
      // Cloudflare's header, which a client cannot write; X-Forwarded-For it can.
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'], ...options.advanced?.ipAddress },
    },
  })
}
