import type { Client } from '@notionhq/client'
import type {
  BlockObjectResponse,
  BulletedListItemBlockObjectResponse,
  CalloutBlockObjectResponse,
  ColumnListBlockObjectResponse,
  Heading1BlockObjectResponse,
  Heading2BlockObjectResponse,
  Heading3BlockObjectResponse,
  ListBlockChildrenResponse,
  NumberedListItemBlockObjectResponse,
  QuoteBlockObjectResponse,
  RichTextItemResponse,
  TableBlockObjectResponse,
  ToDoBlockObjectResponse,
  ToggleBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.d.ts'
import type { LoaderContext } from 'astro/loaders'
import { isFullBlock } from '@notionhq/client'
import { unescapeHTML } from 'astro/compiler-runtime'
import { handleRichText } from './richText'
import { isListItemBlock, isToggleBlock } from './types'

export class NotionRenderer {
  constructor(
    public client: Client,
    public renderMarkdown: LoaderContext['renderMarkdown'],
  ) {}

  async fetchAllChildren(id: string) {
    const allResults: ListBlockChildrenResponse['results'] = []
    let cursor: string | undefined

    while (true) {
      const response = await this.client.blocks.children.list({
        block_id: id,
        start_cursor: cursor,
      })

      allResults.push(...response.results)

      if (!response.has_more)
        break
      cursor = response.next_cursor ?? undefined
    }

    return allResults
  }

  async handleChildren(allChildren: ListBlockChildrenResponse['results']) {
    const content: string[] = []
    const blocks = allChildren.filter(r => isFullBlock(r))

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]

      if (block.type === 'paragraph') {
        content.push(`<p>${handleRichText(block.paragraph.rich_text)}</p>`)
      }
      else if (block.type === 'divider') {
        content.push('<hr />')
      }
      else if (block.type === 'code') {
        content.push((await this.renderMarkdown(`\n\n\`\`\`${block.code.language}\n${unescapeHTML(handleRichText(block.code.rich_text, true))}\n\`\`\`\n\n`)).html)
      }
      else if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
        content.push(await this.handleHeading(block))
      }
      else if (block.type === 'table') {
        content.push(await this.handleTable(block))
      }
      else if (block.type === 'callout') {
        content.push(this.handleCallout(block))
      }
      else if (block.type === 'column_list') {
        content.push(await this.handleColumnList(block))
      }
      else if (block.type === 'to_do') {
        content.push(await this.handleTodo(block))
      }
      else if (block.type === 'quote') {
        content.push(await this.handleQuote(block))
      }
      else if (block.type === 'toggle') {
        content.push(await this.handleToggle(block))
      }
      else if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
        const { result, skipCount } = await this.handleList(blocks.slice(i))
        i += skipCount
        content.push(result)
      }
    }

    return { content: content.join('\n\n') }
  }

  async renderAllChildren(id: string) {
    const allChildren = await this.fetchAllChildren(id)
    return this.handleChildren(allChildren)
  }

  async handleHeading(headingBlock: Heading1BlockObjectResponse | Heading2BlockObjectResponse | Heading3BlockObjectResponse) {
    const { type } = headingBlock
    let heading: string = ''
    let isToggleable = false
    if (type === 'heading_1') {
      heading = `# ${handleRichText(headingBlock.heading_1.rich_text)}`
      isToggleable = headingBlock.heading_1.is_toggleable
    }
    else if (type === 'heading_2') {
      heading = `## ${handleRichText(headingBlock.heading_2.rich_text)}`
      isToggleable = headingBlock.heading_2.is_toggleable
    }
    else if (type === 'heading_3') {
      heading = `### ${handleRichText(headingBlock.heading_3.rich_text)}`
      isToggleable = headingBlock.heading_3.is_toggleable
    }
    if (!isToggleable)
      return heading

    return await this.handleToggle(headingBlock)
  }

  async handleTable(tableBlock: TableBlockObjectResponse) {
    const { table: { has_column_header, has_row_header }, id } = tableBlock
    const { results } = await this.client.blocks.children.list({ block_id: id })

    const rows = results.filter(r => isFullBlock(r) && r.type === 'table_row').map(r => r.table_row.cells)

    const tableRows = rows.map((row, rowIndex) => {
      const cells = row.map((cell, colIndex) => {
        const cellContent = handleRichText(cell)
        if (has_row_header && rowIndex === 0) {
          return `<th scope="col">${cellContent}</th>`
        }
        if (has_column_header && colIndex === 0) {
          return `<th scope="row">${cellContent}</th>`
        }
        return `<td>${cellContent}</td>`
      }).join('')

      return `<tr>${cells}</tr>`
    }).join('')

    return `<table>${tableRows}</table>`
  }

  handleCallout(calloutBlock: CalloutBlockObjectResponse): string {
    const { callout: { icon, rich_text } } = calloutBlock

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

    const text = `<span>${handleRichText(rich_text)}</span>`
    return `<div style="display: flex; padding: 0.5rem; align-items: baseline; gap: 0.25rem;">${iconHTML}<div>${text}</div></div>`
  }

  async handleListItem(listItemBlock: BulletedListItemBlockObjectResponse | NumberedListItemBlockObjectResponse) {
    const { type, id, has_children } = listItemBlock
    const { rich_text } = type === 'bulleted_list_item' ? listItemBlock.bulleted_list_item : listItemBlock.numbered_list_item

    const content = `<span>${handleRichText(rich_text)}</span>`

    if (!has_children) {
      return `<li>${content}</li>`
    }

    const { content: childContent } = await this.renderAllChildren(id)
    return `<li>${content}${childContent}</li>`
  }

  async handleList(blocks: BlockObjectResponse[]) {
    const firstBlock = blocks[0] as BulletedListItemBlockObjectResponse | NumberedListItemBlockObjectResponse
    const listItems = [firstBlock]
    const listType = firstBlock.type

    let count = 1
    while (count < blocks.length) {
      const b = blocks[count]
      if (isListItemBlock(b) && b.type === listType) {
        listItems.push(b)
        count++
      }
      else {
        break
      }
    }

    const listHtml = await Promise.all(listItems.map(item => this.handleListItem(item)))

    const wrapperTag = listType === 'bulleted_list_item' ? 'ul' : 'ol'

    const result = `<${wrapperTag}>\n${listHtml.join('\n')}\n</${wrapperTag}>`
    return { result, skipCount: count - 1 }
  }

  async handleColumnList(columnListBlock: ColumnListBlockObjectResponse) {
    const { results } = await this.client.blocks.children.list({ block_id: columnListBlock.id })
    const columns = results.filter(r => isFullBlock(r) && r.type === 'column')
      .map(async (column) => {
        return `<div>${(await this.renderAllChildren(column.id)).content}</div>`
      })

    return `<div style="display: flex; gap: 1rem;">${await Promise.all(columns).then(cols => cols.join(''))}</div>`
  }

  async handleTodo(todoBlock: ToDoBlockObjectResponse) {
    const { id, has_children, to_do: { rich_text, checked } } = todoBlock
    const checkbox = `<input disabled type="checkbox" ${checked ? 'checked' : ''} />`
    const textContent = `<span>${handleRichText(rich_text)}</span>`

    if (!has_children) {
      return `<div style="display: flex; gap: 0.5rem;">${checkbox}${textContent}</div>`
    }

    const { content: childContent } = await this.renderAllChildren(id)
    return `<div style="display: flex; gap: 0.5rem; align-items: baseline">${checkbox}<div>${textContent}${childContent}</div></div>`
  }

  async handleQuote(quoteBlock: QuoteBlockObjectResponse) {
    const { quote: { rich_text }, has_children } = quoteBlock
    const content = `<span>${handleRichText(rich_text)}</span>`

    if (!has_children)
      return `<blockquote>${content}</blockquote>`

    const { content: childContent } = await this.renderAllChildren(quoteBlock.id)
    return `<blockquote >${content}${childContent}</blockquote>`
  }

  async handleToggle(toggleBlock: ToggleBlockObjectResponse | Heading1BlockObjectResponse | Heading2BlockObjectResponse | Heading3BlockObjectResponse) {
    const { has_children } = toggleBlock
    let richText: RichTextItemResponse[], tag: string
    if (isToggleBlock(toggleBlock)) {
      richText = toggleBlock.toggle.rich_text
      tag = 'span'
    }
    else {
      const headingInfo = getHeadingInfo(toggleBlock)
      richText = headingInfo.richText
      tag = headingInfo.tag
    }

    const content = `<${tag}>${handleRichText(richText)}</${tag}>`
    if (!has_children)
      return `<details><summary>${content}</summary></details>`

    const { content: childContent } = await this.renderAllChildren(toggleBlock.id)
    return `<details><summary>${content}</summary>${childContent}</details>`
  }
}

function getHeadingInfo(block: Heading1BlockObjectResponse | Heading2BlockObjectResponse | Heading3BlockObjectResponse) {
  if (block.type === 'heading_1') {
    return {
      tag: 'h1' as const,
      richText: block.heading_1.rich_text,
    }
  }
  if (block.type === 'heading_2') {
    return {
      tag: 'h2' as const,
      richText: block.heading_2.rich_text,
    }
  }

  return {
    tag: 'h3' as const,
    richText: block.heading_3.rich_text,
  }
}
