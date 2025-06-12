import type { ListBlockChildrenParameters, QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints.d.ts'
import type { ClientOptions } from '@notionhq/client/build/src/Client.d.ts'
import type { PageMetaType, PagePropertiesType } from './utils'
import { Client, isFullBlock, isFullPage } from '@notionhq/client'
import { handleChildren, handleRichText } from './utils'

export function createNotionCtx(options: ClientOptions) {
  const client = new Client(options)

  const getPageContent = async (query: ListBlockChildrenParameters) => {
    const page = await client.pages.retrieve({
      page_id: query.block_id,
    })
    const properties: PagePropertiesType = []
    let meta: PageMetaType | null = null
    if (isFullPage(page)) {
      const { id, object, properties: pageProperties, ...rest } = page
      meta = { ...rest, title: handleRichText(Object.values(pageProperties).find(p => p.type === 'title')?.title, true) }
      properties.push(...Object.entries(pageProperties).map(([label, { id, ...rest }]) => ({ label, value: { ...rest } })))
    }

    const children = await client.blocks.children.list(query)
    const { content } = await handleChildren(children, client)

    return {
      id: page.id,
      meta,
      properties,
      content,
    }
  }

  const queryEntriesFromDatabase = async (query: QueryDatabaseParameters) => {
    const { results } = await client.databases.query(query)
    const entries = await Promise.all(
      results.filter(r => isFullPage(r))
        .map(record => getPageContent({ block_id: record.id })),
    )

    return entries
  }

  const queryEntriesFromPage = async (query: ListBlockChildrenParameters) => {
    const { results } = await client.blocks.children.list(query)
    const entries = await Promise.all(
      results.filter(isFullBlock)
        .filter(block => block.type === 'child_page')
        .map(block => getPageContent({ block_id: block.id })),
    )

    return entries
  }

  return { client, queryEntriesFromDatabase, queryEntriesFromPage, getPageContent }
}
