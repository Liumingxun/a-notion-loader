import type { ExtractBlock } from '../types'
import { handleRichText } from '../utils'
import Fragment from './Fragment'

export default (block: ExtractBlock<'quote'>) => {
  const { quote: { rich_text }, has_children } = block
  const content = `<span>${handleRichText(rich_text)}</span>`

  if (!has_children)
    return `<blockquote>${content}</blockquote>`

  return `<blockquote>${content}${Fragment(block.children!)}</blockquote>`
}
