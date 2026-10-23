import { action, render, RequireAuthLayer, RequireGuestLayer } from '@popcomputer/web/effect'
import { betterAuthLogoutAction } from '@popcomputer/web/auth'
import { startDemo } from './actions/auth'
import { createPost, deletePost, editPost, listPosts, newPost, updatePost } from './actions/posts'
import { showBlog, showFeed, showPublicPost } from './actions/public'
import { showSettings, updateSettings } from './actions/settings'
import { routes } from './app'
import { paths } from './paths'

// Nobody registers: the sign-in page starts the demo, as a guest with a blog.
routes
  .provide(RequireGuestLayer)
  .get(paths.login, action(render('Auth/Login')))
  .post(paths.login, startDemo)

routes.post(paths.logout, betterAuthLogoutAction({ redirectTo: paths.login }))

// The editor: the writer's own posts, drafts too.
routes
  .provide(RequireAuthLayer)
  .get(paths.dashboard, listPosts)
  .get(paths.newPost, newPost)
  .post(paths.posts, createPost, { form: paths.newPost })
  .get(paths.editPost, editPost)
  .put(paths.post, updatePost, { form: paths.editPost, purges: true })
  .delete(paths.post, deletePost, { purges: true })
  .get(paths.settings, showSettings)
  .put(paths.settings, updateSettings)

// The blog, to anyone. Cloudflare's edge keeps each page five minutes, and
// serves a stale one for a day while it fetches the next; the writes above
// purge exactly the pages they change.
const cache = { maxAge: 300, staleWhileRevalidate: 86_400 } as const

routes
  .get(paths.feed, showFeed)
  .get(paths.blog, showBlog, { cache })
  .get(paths.publicPost, showPublicPost, { cache })
