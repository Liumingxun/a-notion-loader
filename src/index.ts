import type { ClientOptions } from '@notionhq/client/build/src/Client'
import type { Loader } from 'astro/loaders'
import type { z } from 'astro/zod'
import type { QueryEntriesFromDatabaseParams } from './utils'
import { createNotionCtx } from './createNotionCtx'
import { pageSchema } from './schema'

type NotionLoaderOptions
  = | { page_id: string, database_id?: never }
    | { database_id: string, page_id?: never } & QueryEntriesFromDatabaseParams

export function notionLoader(
  clientOpts: Omit<ClientOptions, 'notionVersion'>,
  opts: NotionLoaderOptions,
  schema: z.AnyZodObject = pageSchema,
): Loader {
  return {
    name: 'notion-loader',
    schema() {
      return schema
    },
    load: async ({ store, generateDigest, parseData, renderMarkdown }) => {
      const ctx = createNotionCtx(clientOpts, renderMarkdown)

      const handleEntry = async (entry: Awaited<ReturnType<typeof ctx.getPageContent>>) => {
        const data = await parseData({ id: entry.id, data: { ...entry.meta, properties: entry.properties } })
        store.set({
          id: entry.id,
          // digest: generateDigest(entry.meta.last_edited_time),
          digest: generateDigest(Math.random().toString()),
          data,
          filePath: entry.meta.url,
          rendered: entry.content,
        })
      }

      if (opts.page_id) {
        const { queryEntriesFromPage } = ctx

        for await (const entry of queryEntriesFromPage({ block_id: opts.page_id })) {
          await handleEntry(entry)
        }
      }
      else if (opts.database_id) {
        const { queryEntriesFromDatabase } = ctx

        for await (const entry of queryEntriesFromDatabase(opts)) {
          await handleEntry(entry)
        }
      }
      else {
        throw new Error('Either block_id or database_id must be provided.')
      }
    },
  }
}

export { notionLoader as default }
