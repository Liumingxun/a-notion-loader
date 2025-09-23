import type { LoaderContext } from 'astro/loaders'
import type { BlockWithChildren } from '../types'
import Callout from './Callout'
import Code from './Code'
import ColumnList from './ColumnList'
import Embed from './Embed'
import Heading from './Heading'
import { getRenderContext } from './internal/context'
import List from './List'
import MediaContent from './MediaContent'
import Paragraph from './Paragraph'
import Quote from './Quote'
import Table from './Table'
import Todo from './Todo'
import Toggle from './Toggle'

export async function Fragment(blocks: BlockWithChildren[]): ReturnType<LoaderContext['renderMarkdown']> {
  const { renderMarkdown } = getRenderContext()

  const blocksHTML = blocks.map(async (block, idx, children) => {
    switch (block.type) {
      case 'paragraph':
        return Paragraph(block)
      case 'divider':
        return `---`
      case 'code':
        return Code(block)
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        return Heading(block)
      case 'toggle':
        return Toggle(block)
      case 'quote':
        return Quote(block)
      case 'bulleted_list_item':
      case 'numbered_list_item':
        return List(block, children.slice(idx), children[idx - 1])
      case 'to_do':
        return Todo(block)
      case 'callout':
        return Callout(block)
      case 'table':
        return Table(block)
      case 'column_list':
        return ColumnList(block)
      case 'image':
      case 'video':
      case 'audio':
      case 'pdf':
        return MediaContent(block)
      case 'embed':
      case 'bookmark':
        return Embed(block)
      case 'synced_block':
      case 'child_page':
      case 'child_database':
      case 'equation':
      case 'breadcrumb':
      case 'table_of_contents':
      case 'link_to_page':
      case 'file':
      case 'link_preview':
        return block.type
      case 'column':
      case 'table_row':
        // these will never appear
        return ''
      case 'template':
      case 'unsupported':
    }
    return ''
  })

  const htmls = await Promise.all(blocksHTML)
  return await renderMarkdown(htmls.join('\n\n'))
}

export { Fragment as default }
