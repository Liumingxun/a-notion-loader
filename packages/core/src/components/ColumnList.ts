import type { ExtractBlock } from '../types'
import { isFullBlock } from '@notionhq/client'
import Fragment from './Fragment'

export default async (block: ExtractBlock<'column_list'>) => {
  const { has_children } = block
  if (!has_children)
    return ''
  const cols = block.children
    .filter(c => isFullBlock(c) && c.type === 'column')
    .map(async child => `<div>${(await Fragment(child.children ?? [])).html}</div>`)

  return `<div style="display: flex; gap: 1rem;">${await Promise.all(cols).then(cols => cols.join(''))}</div>`
}
