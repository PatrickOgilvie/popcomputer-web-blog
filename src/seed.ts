import type { Database } from './db'
import type { Bindings } from './env'

/**
 * What the local database holds after `bun run db:seed`: nothing. Each guest
 * gets a blog with sample posts (src/demo.ts) when they start the demo.
 */
export async function seed(_db: Database, _env: Bindings): Promise<void> {
  console.log('Nothing to add: start the demo to get a blog of your own.')
}
