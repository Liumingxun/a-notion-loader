import type { ListBlockChildrenParameters, QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints.d.ts'
import type { ClientOptions } from '@notionhq/client/build/src/Client.d.ts'
import type { MetaType, PropertiesType } from './utils'
import { Client, isFullBlock, isFullPage } from '@notionhq/client'
import { reduceRichText } from './utils'

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
      meta = { ...rest, title: reduceRichText(Object.values(pageProperties).find(p => p.type === 'title')?.title) }
      properties.push(...Object.entries(pageProperties).map(([label, value]) => ({ label, value })))
    }

    const pageChildren = await client.blocks.children.list(query)
    const content = pageChildren.results.filter(r => isFullBlock(r)).reduce((acc, block) => {
      if (block.type === 'paragraph') {
        acc += `<p>${reduceRichText(block.paragraph.rich_text)}</p>`
      }
      else if (block.type === 'divider') {
        acc += '<hr />'
      }
      else if (block.type === 'code') {
        acc += `\n\n\`\`\`${block.code.language}\n${reduceRichText(block.code.rich_text)}\n\`\`\`\n\n`
      }
      else if (block.type === 'heading_1') {
        acc += `# ${reduceRichText(block.heading_1.rich_text)}`
      }
      else if (block.type === 'heading_2') {
        acc += `## ${reduceRichText(block.heading_2.rich_text)}`
      }
      else if (block.type === 'heading_3') {
        acc += `### ${reduceRichText(block.heading_3.rich_text)}`
      }

      return acc
    }, '')

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
