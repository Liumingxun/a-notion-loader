import type { BlockWithChildren, ExtractBlock } from '../types'
import { handleRichText } from '../utils'
import Fragment from './Fragment'

async function ListItem(block: ExtractBlock<'bulleted_list_item' | 'numbered_list_item'>) {
  const { type, has_children } = block
  const children = has_children ? (await Fragment(block.children)).html : ''
  if (type === 'bulleted_list_item')
    return `<li>${handleRichText(block.bulleted_list_item.rich_text)}${children}</li>`
  if (type === 'numbered_list_item')
    return `<li>${handleRichText(block.numbered_list_item.rich_text)}${children} </li>`
  return ''
}

async function getRestListItems(targetType: 'bulleted_list_item' | 'numbered_list_item', pendingBlocks: BlockWithChildren[]) {
  const until = pendingBlocks.findIndex(b => b.type !== targetType)
  const rest = (until === -1 ? pendingBlocks : pendingBlocks.slice(0, until)) as ExtractBlock<'bulleted_list_item' | 'numbered_list_item'>[]
  const listItems = await Promise.all(rest.map(li => ListItem(li)))
  return listItems.join('')
}

/**
 * @param block current list item block
 * @param pendingBlocks all the blocks that are not processed yet, including the current block
 * @param previous the previous block of the current block, could be undefined
 * @returns the HTML string of the whole list, including the current block and its following sibling list items
 */
export default async (block: ExtractBlock<'bulleted_list_item' | 'numbered_list_item'>, pendingBlocks: BlockWithChildren[], previous?: BlockWithChildren) => {
  const tag = block.type === 'bulleted_list_item' ? 'ul' : 'ol'

  // skip when the previous block is list item
  if (previous?.type === block.type) {
    return ''
  }

  return `<${tag}>${await getRestListItems(block.type, pendingBlocks)}</${tag}>`
}
