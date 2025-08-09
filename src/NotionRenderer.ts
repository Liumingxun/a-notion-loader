import type { Client } from '@notionhq/client'
import type {
  BlockObjectResponse,
  BulletedListItemBlockObjectResponse,
  CalloutBlockObjectResponse,
  ColumnListBlockObjectResponse,
  Heading1BlockObjectResponse,
  Heading2BlockObjectResponse,
  Heading3BlockObjectResponse,
  NumberedListItemBlockObjectResponse,
  PartialBlockObjectResponse,
  QuoteBlockObjectResponse,
  RichTextItemResponse,
  TableBlockObjectResponse,
  ToDoBlockObjectResponse,
  ToggleBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.d.ts'
import type { LoaderContext } from 'astro/loaders'
import { collectPaginatedAPI, isFullBlock, iteratePaginatedAPI } from '@notionhq/client'
import { handleRichText, isListItemBlock, isToggleBlock, unescapeHTML } from './utils'

export default class NotionRenderer {
  private constructor(
    private client: Client,
    private renderMarkdown: LoaderContext['renderMarkdown'],
  ) {}

  static #instance: NotionRenderer | null
  static getInstance(client: Client, renderMarkdown: LoaderContext['renderMarkdown']) {
    if (!NotionRenderer.#instance) {
      NotionRenderer.#instance = new NotionRenderer(client, renderMarkdown)
    }
    return NotionRenderer.#instance
  }

  async* streamAllChildren(id: string) {
    for await (const result of iteratePaginatedAPI(this.client.blocks.children.list, { block_id: id })) {
      yield result
    }
  }

  collectAllChildren(id: string) {
    return collectPaginatedAPI(this.client.blocks.children.list, { block_id: id })
  }

  async handleChildrenFromStream(childStream: AsyncGenerator<PartialBlockObjectResponse | BlockObjectResponse>) {
    const content: string[] = []
    let pendingBlock: PartialBlockObjectResponse | BlockObjectResponse | undefined

    while (true) {
      const block = pendingBlock ?? (await childStream.next()).value
      pendingBlock = undefined
      if (!block)
        break

      if (!isFullBlock(block))
        continue

      if (block.type === 'paragraph') {
        content.push(`${handleRichText(block.paragraph.rich_text)}`)
      }
      else if (block.type === 'divider') {
        content.push('---')
      }
      else if (block.type === 'code') {
        content.push((await this.renderMarkdown(`\`\`\`${block.code.language}\n${unescapeHTML(handleRichText(block.code.rich_text, true))}\n\`\`\``)).html)
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
      else if (isListItemBlock(block)) {
        const listType = block.type
        const listBlocks = [block]

        while (true) {
          const { value: nextBlock, done } = await childStream.next()
          if (done)
            break
          if (!isFullBlock(nextBlock) || nextBlock.type !== listType) {
            pendingBlock = nextBlock
            break
          }
          listBlocks.push(nextBlock)
        }

        const { result } = await this.handleList(listBlocks)
        content.push(result)
      }
    }

    return this.renderMarkdown(content.join('\n\n'))
  }

  async renderAllChildren(id: string) {
    return this.handleChildrenFromStream(this.streamAllChildren(id))
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
    const results = await collectPaginatedAPI(this.client.blocks.children.list, { block_id: id })

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

    const { html: childContent } = await this.renderAllChildren(id)
    return `<li>${content}${childContent}</li>`
  }

  async handleList(blocks: BlockObjectResponse[]) {
    const firstBlock = blocks[0] as BulletedListItemBlockObjectResponse | NumberedListItemBlockObjectResponse
    const listItems = [firstBlock]
    const listType = firstBlock.type

    let count = 1
    while (count < blocks.length) {
      const b = blocks[count]!
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
    const results = await collectPaginatedAPI(this.client.blocks.children.list, { block_id: columnListBlock.id })
    const columns = results.filter(r => isFullBlock(r) && r.type === 'column')
      .map(async (column) => {
        return `<div>${(await this.renderAllChildren(column.id)).html}</div>`
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

    const { html: childContent } = await this.renderAllChildren(id)
    return `<div style="display: flex; gap: 0.5rem; align-items: baseline">${checkbox}<div>${textContent}${childContent}</div></div>`
  }

  async handleQuote(quoteBlock: QuoteBlockObjectResponse) {
    const { quote: { rich_text }, has_children } = quoteBlock
    const content = `<span>${handleRichText(rich_text)}</span>`

    if (!has_children)
      return `<blockquote>${content}</blockquote>`

    const { html: childContent } = await this.renderAllChildren(quoteBlock.id)
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

    const { html: childContent } = await this.renderAllChildren(toggleBlock.id)
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
