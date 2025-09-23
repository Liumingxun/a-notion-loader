import type { ExtractBlock } from '../types'
import { handleRichText } from '../utils'

export default (block: ExtractBlock<'paragraph'>) => {
  return `${handleRichText(block.paragraph.rich_text)}`
}
