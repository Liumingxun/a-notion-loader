import type { Loader } from 'astro/loaders'
import type { z } from 'astro/zod'
import { createNotionCtx } from './createNotionCtx'

interface EntryProperties {
  properties?: z.AnyZodObject
}

type NotionLoaderOptions =
  | { auth: string, page_id: string, database_id?: never }
  | { auth: string, database_id: string, page_id?: never } & EntryProperties

export function notionLoader(
  opts: NotionLoaderOptions,
): Loader {
  return {
    name: 'notion-loader',
    load: async ({ store }) => {
      const ctx = createNotionCtx({ auth: opts.auth })

      if ('page_id' in opts && opts.page_id) {
        // block_id mode
        const { getPageContent } = ctx
        const { id, content, meta, properties } = await getPageContent({
          block_id: opts.page_id,
        })

        store.set({
          id,
          data: {
            ...meta,
            properties,
          },
          body: content,
          rendered: {
            html: content,
          },
        })
      }
      else if ('database_id' in opts && opts.database_id) {
        // database_id mode
        const { queryDatabase } = ctx
        const result = await queryDatabase({
          database_id: opts.database_id,
        })

        store.set({
          id: opts.database_id,
          data: result,
          body: JSON.stringify(result),
          rendered: {
            html: '',
          },
        })
      }
      else {
        throw new Error('Either block_id or database_id must be provided.')
      }
    },
  }
}

export { notionLoader as default }
