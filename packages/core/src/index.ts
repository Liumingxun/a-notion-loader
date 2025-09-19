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

type ObjectResponse = PageObjectResponse | PartialPageObjectResponse | PartialDataSourceObjectResponse | DataSourceObjectResponse

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
    load: async ({ store, parseData, renderMarkdown }) => {
      const { queryEntriesFromDatabase, queryEntriesFromPage, getPageContent } = createNotionCtx(clientOpts)

      const staleKeys = new Set(store.keys())

      const processEntry = async (entry: ObjectResponse) => {
        if (!isFullPage(entry))
          return

        const cachedEntry = store.get(entry.id)
        // update only when it's new or changed
        if (!cachedEntry || cachedEntry.digest !== entry.last_edited_time) {
          const pageContent = await getPageContent(entry)
          const parsed = await parseData({
            id: pageContent.id,
            data: { ...pageContent.meta, properties: pageContent.properties },
          })
          store.set({
            id: pageContent.id,
            data: parsed,
            digest: entry.last_edited_time,
            rendered: await renderMarkdown(pageContent.content),
          })
        }
        // mark this entry as still valid
        staleKeys.delete(entry.id)
      }

      const updateStoreFromEntries = async (entries: AsyncGenerator<ObjectResponse>) => {
        for await (const entry of entries) {
          await processEntry(entry)
        }
      }

      if (opts.data_source_id) {
        await updateStoreFromEntries(queryEntriesFromDatabase(opts))
      }
      else if (opts.page_id) {
        await updateStoreFromEntries(queryEntriesFromPage({ block_id: opts.page_id }))
      }
      else {
        throw new Error('Either block_id or database_id must be provided.')
      }

      // remove items not found in current sync
      for (const id of staleKeys) {
        store.delete(id)
      }
    },
  }
}

export { notionLoader as default }
