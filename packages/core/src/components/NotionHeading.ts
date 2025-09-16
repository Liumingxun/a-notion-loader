import type { TemplateResult } from 'lit-html'
import type { ExtractBlock } from '../types'
import { html } from 'lit-html'
import { handleRichText } from '../utils'

export default (block: ExtractBlock<'heading_1' | 'heading_2' | 'heading_3'>): TemplateResult<1> => {
  if (block.type === 'heading_1') {
    return html`
      <h1>${handleRichText(block.heading_1.rich_text)}</h1>
    `
  }
  else if (block.type === 'heading_2') {
    return html`
      <h2>${handleRichText(block.heading_2.rich_text)}</h2>
    `
  }
  else {
    return html`
      <h3>${handleRichText(block.heading_3.rich_text)}</h3>
    `
  }
}
