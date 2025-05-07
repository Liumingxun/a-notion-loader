/// <reference types="astro/client" />
import type { Loader, LoaderContext } from 'astro/loaders'
import { z } from 'astro:content'

export function notionLoader(): Loader {
  return {
    name: 'notion-loader',
    load: async () => {},
  }
}

export { notionLoader as default }
