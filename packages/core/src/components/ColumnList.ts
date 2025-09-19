import type { ExtractBlock } from '../types'
import { isFullBlock } from '@notionhq/client'
import Fragment from './Fragment'

export default (block: ExtractBlock<'column_list'>) => {
  const { has_children } = block
  if (!has_children)
    return ''
  const cols = block.children
    .filter(c => isFullBlock(c) && c.type === 'column')
    .map(child => `<div>${Fragment(child.children ?? [])}</div>`)
  return `<div style="display: flex; gap: 1rem;">${cols.join('')}</div>`
}
