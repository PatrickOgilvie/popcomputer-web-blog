// Every route's path, declared once: routes register on them, actions
// redirect to them and pages link to them with href.
export const paths = {
  // The editor: the signed-in writer's own blog.
  dashboard: '/',
  login: '/login',
  logout: '/logout',
  posts: '/posts',
  newPost: '/posts/new',
  post: '/posts/{post}',
  editPost: '/posts/{post}/edit',
  settings: '/settings',
  // The blog as its readers see it: published posts only, to anyone.
  blog: '/b/{blog:slug}',
  feed: '/b/{blog:slug}/feed.xml',
  publicPost: '/b/{blog:slug}/{publicPost:slug}',
} as const
