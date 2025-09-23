import type { ExtractBlock } from '../types'
import { handleRichText } from '../utils'
import Fragment from './Fragment'

export default async (block: ExtractBlock<'quote'>) => {
  const { quote: { rich_text }, has_children } = block
  const content = `<span>${handleRichText(rich_text)}</span>`

  if (!has_children)
    return `<blockquote>${content}</blockquote>`

  return `<blockquote>${content}${(await Fragment(block.children)).html}</blockquote>`
}
