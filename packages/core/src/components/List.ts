import type { BlockWithChildren, ExtractBlock } from '../types'
import { handleRichText } from '../utils'
import Fragment from './Fragment'

function ListItem(block: ExtractBlock<'bulleted_list_item' | 'numbered_list_item'>) {
  const { type } = block
  if (type === 'bulleted_list_item')
    return `<li>${handleRichText(block.bulleted_list_item.rich_text)}${Fragment(block.children!)}</li>`
  if (type === 'numbered_list_item')
    return `<li>${handleRichText(block.numbered_list_item.rich_text)}${Fragment(block.children!)} </li>`
  return ''
}

function getRestListItems(targetType: 'bulleted_list_item' | 'numbered_list_item', pendingBlocks: BlockWithChildren[]) {
  const until = pendingBlocks.findIndex(b => b.type !== targetType)
  const rest = (until === -1 ? pendingBlocks : pendingBlocks.slice(0, until)) as ExtractBlock<'bulleted_list_item' | 'numbered_list_item'>[]
  return rest.map(b => ListItem(b)).join('')
}

export default (block: ExtractBlock<'bulleted_list_item' | 'numbered_list_item'>, idx: number, pendingBlocks: BlockWithChildren[]) => {
  const [previous, ...rest] = pendingBlocks as [typeof pendingBlocks[0], ...typeof pendingBlocks]
  // skip when the previous block is list item
  if (idx !== 0 && previous.type === block.type) {
    return ''
  }
  const tag = block.type === 'bulleted_list_item' ? 'ul' : 'ol'
  return `<${tag}>${getRestListItems(block.type, idx === 0 ? pendingBlocks : rest)}</${tag}>`
}
