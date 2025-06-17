import type { ChildPageBlockObjectResponse, GetDatabaseResponse, GetPageResponse, ListBlockChildrenParameters, PageObjectResponse, QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints.d.ts'
import type { ClientOptions } from '@notionhq/client/build/src/Client.d.ts'
import type { LoaderContext } from 'astro/loaders'
import type { PageMetaType, PagePropertiesType, RecordValueOf } from './utils'
import { Client, isFullBlock, isFullPage } from '@notionhq/client'
import NotionRenderer from './NotionRenderer'
import { handleRichText } from './utils'

export function createNotionCtx(options: ClientOptions, renderMarkdown: LoaderContext['renderMarkdown']) {
  const client = new Client(options)
  const renderer = NotionRenderer.getInstance(client, renderMarkdown)

  const getPageContent = async (block: ChildPageBlockObjectResponse | PageObjectResponse) => {
    const page: GetPageResponse = isFullPage(block) ? block : await client.pages.retrieve({ page_id: block.id })

    if (!isFullPage(page)) {
      throw new Error('Failed to retrieve a full page object. Retrieved: ', {
        cause: page,
      })
    }

    const { id, object, properties: pageProperties, ...rest } = page
    const meta: PageMetaType = {
      ...rest,
      title: handleRichText(Object.values(pageProperties).find(p => p.type === 'title')?.title, true),
    }

    const properties: PagePropertiesType = Object.entries(pageProperties)
      .filter(p => p[1].type !== 'title')
      .map(([label, { id, ...rest }]) => ({ label, value: { ...rest } }))

    const { content } = await renderer.renderAllChildren(page.id)

    return {
      id: page.id,
      meta,
      properties,
      content,
    }
  }

  const queryEntriesFromDatabase = async (
    query: Omit<QueryDatabaseParameters, 'filter_properties'>,
    propertyFilter?: (property: [string, RecordValueOf<GetDatabaseResponse['properties']>]) => boolean,
  ) => {
    const { properties } = await client.databases.retrieve({ database_id: query.database_id })
    const filteredPropIds = propertyFilter
      ? Object.entries(properties).filter(propertyFilter).map(([_, p]) => p.id)
      : undefined

    const { results } = await client.databases.query({
      ...query,
      filter_properties: filteredPropIds,
    })
    const entries = await Promise.all(
      results.filter(r => isFullPage(r))
        .map(record => getPageContent(record)),
    )

    return entries
  }

  const queryEntriesFromPage = async (query: ListBlockChildrenParameters) => {
    const { results } = await client.blocks.children.list(query)
    const entries = await Promise.all(
      results.filter(isFullBlock)
        .filter(block => block.type === 'child_page')
        .map(block => getPageContent(block)),
    )

    return entries
  }

  return { client, queryEntriesFromDatabase, queryEntriesFromPage, getPageContent }
}
