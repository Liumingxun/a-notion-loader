import type { ExtractBlock } from '../types'
import { handleRichText } from '../utils'
import Fragment from './Fragment'

export default (block: ExtractBlock<'to_do'>) => {
  const { has_children, to_do: { rich_text, checked } } = block
  const checkbox = `<input disabled type="checkbox" ${checked ? 'checked' : ''} />`
  const textContent = `<span>${handleRichText(rich_text)}</span>`

  if (!has_children) {
    return `<div style="display: flex; gap: 0.5rem;">${checkbox}${textContent}</div>`
  }

  return `<div style="display: flex; gap: 0.5rem; align-items: baseline">${checkbox}<div>${textContent}${Fragment(block.children!)}</div></div>`
}
