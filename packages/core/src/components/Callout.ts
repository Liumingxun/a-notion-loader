import type { ExtractBlock } from '../types'
import { handleRichText } from '../utils'
import Fragment from './Fragment'

export default (block: ExtractBlock<'callout'>) => {
  const { callout: { rich_text, icon }, has_children } = block

  let iconHTML = ''
  if (icon) {
    if (icon.type === 'emoji') {
      iconHTML = `<span>${icon.emoji}</span>`
    }
    else if (icon.type === 'external') {
      iconHTML = `<img style="width: 1.25rem; display: inline-block" src="${icon.external.url}" alt="Icon" />`
    }
    else if (icon.type === 'custom_emoji') {
      iconHTML = `<img style="width: 1.25rem; display: inline-block" src="${icon.custom_emoji.url}" alt="${icon.custom_emoji.name}" />`
    }
    else if (icon.type === 'file') {
      iconHTML = `<img style="width: 1.25rem; display: inline-block" src="${icon.file.url}" alt="Icon" />`
    }
  }

  const text = `<div>${handleRichText(rich_text)}</div>`
  if (!has_children)
    return `<div style="display: flex; padding: 0.5rem; align-items: baseline; gap: 0.25rem;">${iconHTML}<div>${text}</div></div>`
  return `<div style="display: flex; padding: 0.5rem; gap: 0.25rem;">${iconHTML}<div>${text}<div>${Fragment(block.children)}</div></div></div>`
}
