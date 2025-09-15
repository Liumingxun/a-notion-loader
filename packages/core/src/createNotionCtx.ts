import type { ChildPageBlockObjectResponse, GetPageResponse, ListBlockChildrenParameters, PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.d.ts'
import type { ClientOptions } from '@notionhq/client/build/src/Client.d.ts'
import type { LoaderContext } from 'astro/loaders'
import type { PageMetaType, PageProperties, QueryEntriesFromDatabaseParams } from './utils'
import { Client, isFullBlock, isFullDatabase, isFullPage, iteratePaginatedAPI } from '@notionhq/client'
import NotionRenderer from './NotionRenderer'
import { handleRichText } from './utils'

interface PageContent {
  id: string
  meta: PageMetaType
  properties: PageProperties
  content: Awaited<ReturnType<LoaderContext['renderMarkdown']>>
}

export function createNotionCtx(options: ClientOptions, renderMarkdown: LoaderContext['renderMarkdown']) {
  const client = new Client(options)
  const renderer = NotionRenderer.getInstance(client, renderMarkdown)

  const getPageContent = async (block: ChildPageBlockObjectResponse | PageObjectResponse): Promise<PageContent> => {
    const page: GetPageResponse = isFullPage(block) ? block : await client.pages.retrieve({ page_id: block.id })

    if (!isFullPage(page)) {
      throw new Error('Failed to retrieve a full page object. Retrieved: ', {
        cause: page,
      })
    }

    const { id, object, properties, ...rest } = page
    const meta: PageMetaType = {
      ...rest,
      title: handleRichText(Object.values(properties).find(p => p.type === 'title')?.title, true),
    }

    const content = await renderer.renderAllChildren(page.id)

    return {
      id: page.id,
      meta,
      properties,
      content,
    }
  }

  const queryEntriesFromDatabase = async function* (params: QueryEntriesFromDatabaseParams) {
    const { data_source_id, property_filter } = params

    const { properties } = await client.dataSources.retrieve({ data_source_id })

    const filter_properties = property_filter
      ? Object.entries(properties).filter(property_filter).map(([_, p]) => p.id)
      : undefined

    const results = iteratePaginatedAPI(client.dataSources.query, {
      ...params,
      filter_properties,
    })

    for await (const record of results) {
      if (!isFullPage(record))
        continue
      try {
        yield await getPageContent(record)
      }
      catch (error) {
        console.error(error)
        continue
      }
    }
  }

  const queryEntriesFromPage = async function* (params: ListBlockChildrenParameters) {
    const results = iteratePaginatedAPI(client.blocks.children.list, params)

    for await (const block of results) {
      if (!isFullBlock(block) || block.type !== 'child_page')
        continue
      try {
        yield await getPageContent(block)
      }
      catch (error) {
        console.error(error)
        continue
      }
    }
  }

  return { client, queryEntriesFromDatabase, queryEntriesFromPage, getPageContent }
}
