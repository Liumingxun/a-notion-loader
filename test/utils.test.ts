import type { ListBlockChildrenResponse, PageObjectResponse, ParagraphBlockObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { isFullBlock } from '@notionhq/client'
import { expect, it } from 'vitest'
import { reduceRichText } from '../utils'
import content from './paragraph.json'

(content as ListBlockChildrenResponse).results.filter(r => isFullBlock(r) && r.type === 'paragraph').map(p => it(`paragraph`, () => {
  return expect(reduceRichText(p.paragraph.rich_text)).toMatchSnapshot()
}))
