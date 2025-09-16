import type { TemplateResult } from 'lit-html'
import type { BlockWithChildren } from '../types'
import { html, nothing } from 'lit-html'
import NotionHeading from './NotionHeading'
import NotionParagraph from './NotionParagraph'

export default (blocks: BlockWithChildren[]): TemplateResult<1> => {
  return html`${blocks.map((block) => {
    switch (block.type) {
      case 'paragraph':
        return NotionParagraph(block)
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        return NotionHeading(block)
      case 'code':
        return ''
      case 'bulleted_list_item':
      case 'numbered_list_item':
      case 'quote':
      case 'to_do':
      case 'toggle':
      case 'template':
      case 'synced_block':
      case 'child_page':
      case 'child_database':
      case 'equation':
      case 'callout':
      case 'divider':
      case 'breadcrumb':
      case 'table_of_contents':
      case 'column_list':
      case 'column':
      case 'link_to_page':
      case 'table':
      case 'table_row':
      case 'embed':
      case 'bookmark':
      case 'image':
      case 'video':
      case 'pdf':
      case 'file':
      case 'audio':
      case 'link_preview':
      case 'unsupported':
        return html`<li>${block.type}</li>`
    }
    return nothing
  })
  }`
}
