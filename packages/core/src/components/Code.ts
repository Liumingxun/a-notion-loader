import type { ExtractBlock } from '../types'
import { unescapeHTML } from 'astro/compiler-runtime'
import { handleRichText } from '../utils'

export default (block: ExtractBlock<'code'>) => {
  return `
  \`\`\`${block.code.language}\n${unescapeHTML(handleRichText(block.code.rich_text, true))}\n\`\`\`
  `
}
