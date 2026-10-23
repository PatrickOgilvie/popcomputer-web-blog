import './styles.css'
import { createInertiaApp } from '@inertiajs/react'
import type { PageName } from '@popcomputer/web/effect'
import type { WebPage } from '@popcomputer/web/react'
import { createRoot } from 'react-dom/client'
import Login from './pages/Auth/Login'
import BlogIndex from './pages/Blog/Index'
import BlogPost from './pages/Blog/Post'
import ErrorPage from './pages/Errors/Error'
import Editor from './pages/Posts/Editor'
import PostsIndex from './pages/Posts/Index'
import Settings from './pages/Settings'
import { appTitle } from './title'

// Every registered page's component: a page without one is a type error.
const components: { readonly [Name in PageName]: WebPage<Name> } = {
  'Auth/Login': Login,
  'Posts/Index': PostsIndex,
  'Posts/Editor': Editor,
  Settings,
  'Blog/Index': BlogIndex,
  'Blog/Post': BlogPost,
}

const isPage = (name: string): name is PageName => name in components

void createInertiaApp({
  title: (title) => (title ? `${title} · ${appTitle}` : appTitle),
  // The error page is not a registered page: it answers any other name.
  resolve: (name) => (isPage(name) ? components[name] : ErrorPage),
  setup({ el, App, props }) {
    if (el !== null) createRoot(el).render(<App {...props} />)
  },
})
