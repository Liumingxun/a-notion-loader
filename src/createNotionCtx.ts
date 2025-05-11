import type { ListBlockChildrenParameters, QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints.d.ts'
import type { ClientOptions } from '@notionhq/client/build/src/Client.d.ts'
import type { MetaType, PropertiesType } from './utils'
import { Client, isFullPage } from '@notionhq/client'
import { handleChildren, handleRichText } from './utils'

export function createNotionCtx(options: ClientOptions) {
  const client = new Client(options)

  const queryPage = async (query: ListBlockChildrenParameters) => {
    const page = await client.pages.retrieve({
      page_id: query.block_id,
    })
    const properties: PropertiesType = []
    let meta: MetaType = {}
    if (isFullPage(page)) {
      const { id, object, properties: pageProperties, ...rest } = page
      meta = { ...rest, title: handleRichText(Object.values(pageProperties).find(p => p.type === 'title')?.title, true) }
      properties.push(...Object.entries(pageProperties).map(([label, value]) => ({ label, value })))
    }

    const { content } = await handleChildren(query, client)

    return {
      id: page.id,
      meta,
      content,
      properties,
    }
  }

  const queryDatabase = async (query: QueryDatabaseParameters) => {
    const queryDatabaseResponse = await client.databases.query(query)

    return queryDatabaseResponse.results.filter(item => isFullPage(item))
    //   const result = await queryDatabaseResponseSchema.safeParseAsync(queryDatabaseResponse)
    //   if (result.success) {
    //     return result.data.results
    //   }
    //   return result.error
    // };
  }
  return { client, queryDatabase, queryPage }
}
