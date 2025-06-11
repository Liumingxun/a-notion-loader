import type { ListBlockChildrenParameters, QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints.d.ts'
import type { ClientOptions } from '@notionhq/client/build/src/Client.d.ts'
import type { DatabaseMetaType, DatabasePropertiesType, PageMetaType, PagePropertiesType } from './utils'
import { Client, isFullDatabase, isFullPage } from '@notionhq/client'
import { handleChildren, handleRichText } from './utils'

export function createNotionCtx(options: ClientOptions) {
  const client = new Client(options)

  const getPageContent = async (query: ListBlockChildrenParameters) => {
    const page = await client.pages.retrieve({
      page_id: query.block_id,
    })
    const properties: PagePropertiesType = []
    let meta: PageMetaType = {}
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

  const queryDatabase = async (query: QueryDatabaseParameters) => {
    const database = await client.databases.retrieve({
      database_id: query.database_id,
    })

    const properties: DatabasePropertiesType = []
    let meta: DatabaseMetaType = {}
    if (isFullDatabase(database)) {
      const { id, title, object, properties: databaseProperties, ...rest } = database
      meta = { title: handleRichText(title, true), ...rest }
      properties.push(...Object.entries(databaseProperties).map(([label, { id, ...rest }]) => ({ label, value: { ...rest } })))
    }

    const { results } = await client.databases.query(query)
    const entries = await Promise.all(
      results.filter(r => isFullPage(r)).map(async record => getPageContent({ block_id: record.id })),
    )

    return {
      id: database.id,
      meta,
      properties,
      entries,
    }
  }

  return { client, queryDatabase, getPageContent }
}
