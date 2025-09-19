import type { ChildPageBlockObjectResponse, GetPageResponse, ListBlockChildrenParameters, PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.d.ts'
import type { ClientOptions } from '@notionhq/client/build/src/Client.d.ts'
import type { BlockWithChildren, PageMetaType, PageProperties, QueryEntriesFromDatabaseParams } from './types'
import { Client, isFullBlock, isFullPage, iteratePaginatedAPI } from '@notionhq/client'
import NotionPage from './components/Fragment'
import { handleRichText } from './utils'

interface PageContent {
  id: string
  meta: PageMetaType
  properties: PageProperties
  content: string
}

export function createNotionCtx(options: ClientOptions) {
  const client = new Client(options)

  const collectAllChildren = async function* ({ block_id }: { block_id: string }): AsyncGenerator<BlockWithChildren> {
    for await (const block of iteratePaginatedAPI(client.blocks.children.list, { block_id })) {
      if (!isFullBlock(block))
        continue
      if (block.has_children) {
        const children: BlockWithChildren[] = []
        for await (const child of collectAllChildren({ block_id: block.id })) {
          children.push(child)
        }
        yield {
          ...block,
          has_children: true,
          children,
        }
      }
      else {
        yield { ...block, has_children: false }
      }
    }
  }

  const getPageContent = async (block: ChildPageBlockObjectResponse | PageObjectResponse): Promise<PageContent> => {
    const page: GetPageResponse = isFullPage(block) ? block : await client.pages.retrieve({ page_id: block.id })

    if (!isFullPage(page)) {
      throw new Error('Failed to retrieve a full page object. Retrieved: ', {
        cause: page,
      })
    }

    const { id: block_id, object, properties, ...rest } = page
    const meta: PageMetaType = {
      ...rest,
      title: handleRichText(Object.values(properties).find(p => p.type === 'title')?.title, true),
    }

    const blocks = await Array.fromAsync(collectAllChildren({ block_id }))

    return {
      id: page.id,
      meta,
      properties,
      content: NotionPage(blocks),
    }
  }

  const queryEntriesFromDatabase = async function* (params: QueryEntriesFromDatabaseParams) {
    const { data_source_id, property_filter } = params
    const { properties } = await client.dataSources.retrieve({ data_source_id })

    const filter_properties = property_filter
      ? Object.entries(properties).filter(property_filter).map(([_, p]) => p.id)
      : undefined

    yield* iteratePaginatedAPI(client.dataSources.query, {
      ...params,
      filter_properties,
    })
  }

  const queryEntriesFromPage = async function* (params: ListBlockChildrenParameters) {
    const results = iteratePaginatedAPI(client.blocks.children.list, params)

    for await (const block of results) {
      if (!isFullBlock(block) || block.type !== 'child_page')
        continue
      try {
        yield await client.pages.retrieve({ page_id: block.id })
      }
      catch (error) {
        console.error(error)
        continue
      }
    }
  }

  return { client, queryEntriesFromDatabase, queryEntriesFromPage, getPageContent }
}
