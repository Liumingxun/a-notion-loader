import type { ClientOptions } from '@notionhq/client/build/src/Client'
import type { Loader } from 'astro/loaders'
import type { PagePropertyValue, QueryEntriesFromDatabaseParams } from './utils'
import { z } from 'astro/zod'
import { createNotionCtx } from './createNotionCtx'
import { pageSchema } from './schema'

type NotionLoaderOptions
  = | { page_id: string, data_source_id?: never }
    | QueryEntriesFromDatabaseParams & { page_id?: never }

interface PropertiesType {
  [key: string]: PagePropertyValue['type']
}

export function notionLoader(
  clientOpts: Omit<ClientOptions, 'notionVersion'>,
  opts: NotionLoaderOptions,
  propertiesType: PropertiesType = {},
): Loader {
  return {
    name: 'a-notion-loader',
    async schema() {
      try {
        const { pagePropertySchema }: { pagePropertySchema: z.ZodDiscriminatedUnion<string, z.ZodDiscriminatedUnionOption<string>[]> }
          // @ts-expect-error This file is generated at runtime
          = await import('./property.notion.zod')
        const { pageBlockSchema }: { pageBlockSchema: z.ZodArray<z.AnyZodObject> }
          // @ts-expect-error This file is generated at runtime
          = await import('./block.notion.zod')

        // subpage only has "title" property
        if (opts.page_id) {
          return pageSchema.extend({
            properties: z.object({ title: pagePropertySchema.optionsMap.get('title')! }),
            blocks: pageBlockSchema,
          })
        }

        // no properties defined
        if (Object.keys(propertiesType).length === 0) {
          console.warn('For better type hints, try setting the page\'s property types.')
          return pageSchema.extend({
            blocks: pageBlockSchema,
          })
        }

        const properties = Object.entries(propertiesType).reduce((properties, [label, type]) => {
          return properties.extend({
            [label]: pagePropertySchema.optionsMap.get(type)!,
          })
        }, z.object({})).passthrough()
        return pageSchema.extend({ properties, blocks: pageBlockSchema })
      }
      catch {
        console.error('Try running `npx nzodify` to generate the Notion\'s zod schema.')
        return pageSchema
      }
    },
    load: async ({ store, generateDigest, parseData }) => {
      const ctx = createNotionCtx(clientOpts)

      const handleEntry = async (entry: Awaited<ReturnType<typeof ctx.getPageContent>>) => {
        const data = await parseData({ id: entry.id, data: { ...entry.meta, properties: entry.properties, blocks: entry.blocks } })
        store.set({
          id: entry.id,
          digest: import.meta.env.DEV ? generateDigest(Math.random().toString()) : generateDigest(entry.meta.last_edited_time),
          data,
          filePath: entry.meta.url,
        })
      }

      if (opts.page_id) {
        const { queryEntriesFromPage } = ctx

        for await (const entry of queryEntriesFromPage({ block_id: opts.page_id })) {
          await handleEntry(entry)
        }
      }
      else if (opts.data_source_id) {
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
