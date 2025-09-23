import type { ExtractBlock } from '../types'
import { handleRichText } from '../utils'
import Toggle from './Toggle'

function isToggleableHeading(headingBlock: ExtractBlock<'heading_1' | 'heading_2' | 'heading_3'>): boolean {
  const { type } = headingBlock

  if (type === 'heading_1')
    return headingBlock.heading_1.is_toggleable
  if (type === 'heading_2')
    return headingBlock.heading_2.is_toggleable
  if (type === 'heading_3')
    return headingBlock.heading_3.is_toggleable

  return false
}

function getHeadingText(headingBlock: ExtractBlock<'heading_1' | 'heading_2' | 'heading_3'>): string {
  const { type } = headingBlock

  // TODO: using html tag can't collect heading rightly
  // https://github.com/withastro/astro/blob/main/packages/markdown/remark/src/rehype-collect-headings.ts
  // node_modules/.pnpm/@astrojs+markdown-remark@6.3.6/node_modules/@astrojs/markdown-remark/dist/rehype-collect-headings.js
  if (type === 'heading_1')
    return `<h1>${handleRichText(headingBlock.heading_1.rich_text)}</h1>`
  if (type === 'heading_2')
    return `<h2>${handleRichText(headingBlock.heading_2.rich_text)}</h2>`
  if (type === 'heading_3')
    return `<h3>${handleRichText(headingBlock.heading_3.rich_text)}</h3>`

  return ''
}

export default (block: ExtractBlock<'heading_1' | 'heading_2' | 'heading_3'>) => {
  if (isToggleableHeading(block))
    return Toggle(block)

  return getHeadingText(block)
}
