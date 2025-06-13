import type { Loader } from 'astro/loaders'
import { z } from 'astro/zod'
import { createNotionCtx } from './createNotionCtx'

interface EntryProperties {
  properties?: z.AnyZodObject
}

type NotionLoaderOptions =
  | { auth: string, page_id: string, database_id?: never }
  | { auth: string, database_id: string, page_id?: never } & EntryProperties

export function notionLoader(
  opts: NotionLoaderOptions,
  schema: z.ZodAny = z.any(),
): Loader {
  return {
    name: 'notion-loader',
    schema() {
      return schema
    },
    load: async ({ store, generateDigest }) => {
      const ctx = createNotionCtx({ auth: opts.auth })

      if ('page_id' in opts && opts.page_id) {
        // block_id mode
        const { queryEntriesFromPage } = ctx
        const entries = await queryEntriesFromPage({
          block_id: opts.page_id,
        })

        for (const entry of entries) {
          store.set({
            id: entry.id,
            digest: Math.random().toString(),
            data: entry.meta!,
            filePath: entry.meta!.url,
            rendered: {
              html: entry.content,
            },
          })
        }
      }
      else if ('database_id' in opts && opts.database_id) {
        // database_id mode
        const { queryEntriesFromDatabase } = ctx
        const entries = await queryEntriesFromDatabase({
          database_id: opts.database_id,
        })

        entries.forEach((entry) => {
          store.set({
            id: entry.id,
            digest: generateDigest(entry.meta!.last_edited_time),
            data: entry.meta!,
            filePath: entry.meta!.url,
            rendered: {
              html: entry.content,
            },
          })
        })
      }
      else {
        throw new Error('Either block_id or database_id must be provided.')
      }
    },
  }
}

export { notionLoader as default }
