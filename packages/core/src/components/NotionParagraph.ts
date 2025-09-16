import type { TemplateResult } from 'lit-html'
import type { ExtractBlock } from '../types'
import { html } from 'lit-html'
import { handleRichText } from '../utils'

export default (block: ExtractBlock<'paragraph'>): TemplateResult<1> => {
  return html`
    <p>${handleRichText(block.paragraph.rich_text)}</p>
  `
}
