import type { BlockWithChildren } from '../types'
import { html } from 'lit-html'
import {} from 'lit-html/directive.js'

export default (blocks: BlockWithChildren[]) => {
  return html`<ul>
    ${
      blocks.map(block => html`<li>${block.type}</li>`)
    }
  </ul>
  `
}
