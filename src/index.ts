import type { ClientOptions } from '@notionhq/client/build/src/Client'
import type { Loader } from 'astro/loaders'
import type { PagePropertyValue, QueryEntriesFromDatabaseParams } from './utils'
import { z } from 'astro/zod'
import { createNotionCtx } from './createNotionCtx'
import { pageSchema } from './schema'

type NotionLoaderOptions
  = | { page_id: string, database_id?: never }
    | { database_id: string, page_id?: never } & QueryEntriesFromDatabaseParams

interface PropertiesType {
  [key: string]: PagePropertyValue['type']
}

export function notionLoader(
  clientOpts: Omit<ClientOptions, 'notionVersion'>,
  opts: NotionLoaderOptions,
  propertiesType?: PropertiesType,
): Loader {
  return {
    name: 'a-notion-loader',
    async schema() {
      if (!propertiesType || Object.keys(propertiesType).length === 0) {
        console.warn('For better type hints, try setting the page\'s property types.')
        return pageSchema
      }
      try {
        // @ts-expect-error This file is generated at runtime
        const { pagePropertyValueSchema } = await import('./property.notion.zod')
        const properties = Object.entries(propertiesType).reduce((properties, [label, type]) => {
          return properties.extend({
            [label]: pagePropertyValueSchema.optionsMap.get(type)!,
          })
        }, z.object({}))
        return pageSchema.extend({ properties })
      }
      catch {
        console.error('Try running `npx nzodify` to generate the Notion property type.')
        return pageSchema
      }
    },
    load: async ({ store, generateDigest, parseData, renderMarkdown }) => {
      const ctx = createNotionCtx(clientOpts, renderMarkdown)

      const handleEntry = async (entry: Awaited<ReturnType<typeof ctx.getPageContent>>) => {
        const data = await parseData({ id: entry.id, data: { ...entry.meta, properties: entry.properties } })
        store.set({
          id: entry.id,
          digest: generateDigest(entry.meta.last_edited_time),
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
