import type { Loader } from 'astro/loaders'
import type { z } from 'astro/zod'
import { createNotionCtx } from './createNotionCtx'
import { pageSchema } from './schema'

interface EntryProperties {
  properties?: z.AnyZodObject
}

type NotionLoaderOptions =
  | { auth: string, page_id: string, database_id?: never }
  | { auth: string, database_id: string, page_id?: never } & EntryProperties

export function notionLoader(
  opts: NotionLoaderOptions,
  schema = pageSchema,
): Loader {
  return {
    name: 'notion-loader',
    schema() {
      return schema
    },
    load: async ({ store, generateDigest, parseData, renderMarkdown }) => {
      const ctx = createNotionCtx({ auth: opts.auth }, renderMarkdown)
      const handleEntries = async (entries: Awaited<ReturnType<typeof ctx.getPageContent>>[]) => {
        for (const entry of entries) {
          const data = await parseData({ id: entry.id, data: { ...entry.meta, properties: entry.properties } })
          store.set({
            id: entry.id,
            // digest: generateDigest(entry.meta.last_edited_time),
            digest: generateDigest(Math.random().toString()),
            data,
            filePath: entry.meta.url,
            rendered: {
              html: entry.content,
            },
          })
        }
      }

      if (opts.page_id) {
        const { queryEntriesFromPage } = ctx
        const entries = await queryEntriesFromPage({
          block_id: opts.page_id,
        })

        await handleEntries(entries)
      }
      else if (opts.database_id) {
        const { queryEntriesFromDatabase } = ctx
        const entries = await queryEntriesFromDatabase({
          database_id: opts.database_id,
        })

        await handleEntries(entries)
      }
      else {
        throw new Error('Either block_id or database_id must be provided.')
      }
    },
  }
}

export { notionLoader as default }
