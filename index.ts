import type { ListBlockChildrenParameters, QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints'
import type { ClientOptions } from '@notionhq/client/build/src/Client'
import { Client, isFullBlock, isFullPage } from '@notionhq/client'
import { reduceRichText } from './utils'

export function createNotionCtx(options: ClientOptions) {
  const client = new Client(options)

  const queryPage = async (query: ListBlockChildrenParameters) => {
    const listPageChildrenResponse = await client.blocks.children.list(query)
    return listPageChildrenResponse.results.reduce((acc, cur) => {
      if (isFullBlock(cur)) {
        if (cur.type === 'paragraph') {
          acc += `<p>${reduceRichText(cur.paragraph.rich_text)}</p>`
        }
      }
      return acc
    }, '')
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
