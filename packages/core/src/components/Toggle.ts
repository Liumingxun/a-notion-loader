import type { ExtractBlock } from '../types'
import { handleRichText } from '../utils'
import Fragment from './Fragment'

function extractRichTextAndTag(block: ExtractBlock<'toggle' | 'heading_1' | 'heading_2' | 'heading_3'>) {
  const { type } = block

  if (type === 'toggle')
    return { richText: block.toggle.rich_text, tag: 'span' }
  if (type === 'heading_1')
    return { richText: block.heading_1.rich_text, tag: 'h1' }
  if (type === 'heading_2')
    return { richText: block.heading_2.rich_text, tag: 'h2' }
  if (type === 'heading_3')
    return { richText: block.heading_3.rich_text, tag: 'h3' }

  return {}
}

export default async (block: ExtractBlock<'toggle' | 'heading_1' | 'heading_2' | 'heading_3'>) => {
  const { has_children } = block

  const { richText, tag } = extractRichTextAndTag(block)

  const content = `<${tag}>${handleRichText(richText)}</${tag}>`
  if (!has_children)
    return `<details><summary>${content}</summary></details>`
  return `<details open><summary>${content}</summary>${(await Fragment(block.children)).html}</details>`
}
