import type { Client } from '@notionhq/client'
import type { GetPagePropertyParameters, PeoplePropertyItemObjectResponse, PropertyItemObjectResponse, RelationPropertyItemObjectResponse } from '@notionhq/client/build/src/api-endpoints.d.ts'
import { handleRichText } from './richText'

export async function handleProperty(query: GetPagePropertyParameters, client: Client) {
  // TODO: shounldn't query properties in this function
  const property = await client.pages.properties.retrieve(query)

  if (property.object === 'list') {
    const { results, property_item: { type } } = property
    if (type === 'title') {
      return handleRichText(results.filter(p => p.type === 'title').map(p => p.title), true)
    }
    else if (type === 'rich_text') {
      return handleRichText(results.filter(p => p.type === 'rich_text').map(p => p.rich_text))
    }
    else if (type === 'relation') {
      return results as RelationPropertyItemObjectResponse[]
    }
    else if (type === 'people') {
      return results as PeoplePropertyItemObjectResponse[]
    }
    else if (type === 'rollup' && property.property_item.type === 'rollup') {
      const { rollup } = property.property_item
      return { rollup, results }
    }
  }
  return property as PropertyItemObjectResponse
}
