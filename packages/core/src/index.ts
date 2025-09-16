import type { DataSourceObjectResponse, PageObjectResponse, PartialDataSourceObjectResponse, PartialPageObjectResponse } from '@notionhq/client'
import type { ClientOptions } from '@notionhq/client/build/src/Client'
import type { Loader } from 'astro/loaders'
import type { PagePropertyValue, QueryEntriesFromDatabaseParams } from './types'
import { isFullPage } from '@notionhq/client'
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

        // subpage only has "title" property
        if (opts.page_id) {
          return pageSchema.extend({
            properties: z.object({ title: pagePropertySchema.optionsMap.get('title')! }),
          })
        }

        // no properties defined
        if (Object.keys(propertiesType).length === 0) {
          console.warn('For better type hints, try setting the page\'s property types.')
          return pageSchema
        }

        const properties = Object.entries(propertiesType).reduce((properties, [label, type]) => {
          return properties.extend({
            [label]: pagePropertySchema.optionsMap.get(type)!,
          })
        }, z.object({})).passthrough()
        return pageSchema.extend({ properties })
      }
      catch {
        console.error('Try running `npx nzodify` to generate the Notion\'s zod schema.')
        return pageSchema
      }
    },
    load: async ({ store, parseData }) => {
      const { queryEntriesFromDatabase, queryEntriesFromPage, getPageContent } = createNotionCtx(clientOpts)
      const unusedKeys = new Set(store.keys())

      const handleEntries = async (entries: AsyncGenerator<PageObjectResponse | PartialPageObjectResponse | PartialDataSourceObjectResponse | DataSourceObjectResponse>) => {
        for await (const entry of entries) {
          if (!isFullPage(entry))
            return

          const existing = store.get(entry.id)
          // update when changed and new
          if (!existing || existing.digest !== entry.last_edited_time) {
            const pageContent = await getPageContent(entry)
            const data = await parseData({ id: pageContent.id, data: { ...pageContent.meta, properties: pageContent.properties } })
            store.set({
              id: pageContent.id,
              data,
              digest: entry.last_edited_time,
              rendered: {
                html: await pageContent.content,
              },
            })
          }
          // mark as used
          unusedKeys.delete(entry.id)
        }
        // delete removed pages
        unusedKeys.forEach(id => store.delete(id))
      }

      if (opts.data_source_id) {
        handleEntries(queryEntriesFromDatabase(opts))
      }
      else if (opts.page_id) {
        handleEntries(queryEntriesFromPage({ block_id: opts.page_id }))
      }
      else {
        throw new Error('Either block_id or database_id must be provided.')
      }
    },
  }
}

export { notionLoader as default }
