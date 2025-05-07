import type { ListBlockChildrenParameters, QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints.d.ts'
import type { ClientOptions } from '@notionhq/client/build/src/Client.d.ts'
import { Client, isFullBlock, isFullPage } from '@notionhq/client'
import { reduceRichText } from './utils'

export function createNotionCtx(options: ClientOptions) {
  const client = new Client(options)

  const queryPage = async (query: ListBlockChildrenParameters) => {
    const listPageChildrenResponse = await client.blocks.children.list(query)
    return listPageChildrenResponse.results.filter(r => isFullBlock(r)).reduce((acc, cur) => {
      if (cur.type === 'paragraph') {
        acc += `<p>${reduceRichText(cur.paragraph.rich_text)}</p>`
      }
      else if (cur.type === 'divider') {
        acc += '\n\n---\n\n'
      }
      else if (cur.type === 'code') {
        acc += `\n\n\`\`\`${cur.code.language}\n${reduceRichText(cur.code.rich_text)}\n\`\`\`\n\n`
      }
      else if (cur.type === 'heading_1') {
        acc += `# ${reduceRichText(cur.heading_1.rich_text)}`
      }
      else if (cur.type === 'heading_2') {
        acc += `## ${reduceRichText(cur.heading_2.rich_text)}`
      }
      else if (cur.type === 'heading_3') {
        acc += `### ${reduceRichText(cur.heading_3.rich_text)}`
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
