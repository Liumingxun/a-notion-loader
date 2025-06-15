import type { Client } from '@notionhq/client'
import type { BlockObjectResponse, BulletedListItemBlockObjectResponse, CalloutBlockObjectResponse, ColumnListBlockObjectResponse, DatabaseObjectResponse, GetPagePropertyParameters, Heading1BlockObjectResponse, Heading2BlockObjectResponse, Heading3BlockObjectResponse, ListBlockChildrenResponse, MentionRichTextItemResponse, NumberedListItemBlockObjectResponse, PageObjectResponse, PeoplePropertyItemObjectResponse, PropertyItemObjectResponse, QuoteBlockObjectResponse, RelationPropertyItemObjectResponse, RichTextItemResponse, TableBlockObjectResponse, ToDoBlockObjectResponse, ToggleBlockObjectResponse } from '@notionhq/client/build/src/api-endpoints.d.ts'
import { isFullBlock, isFullUser } from '@notionhq/client'
import { escapeHTML } from 'astro/runtime/server/escape.js'

function applyAnnotations(content: string, annotations: Record<string, boolean>): string {
  const annotationMap: Record<string, (text: string) => string> = {
    bold: text => `<strong>${text}</strong>`,
    italic: text => `<em>${text}</em>`,
    strikethrough: text => `<s>${text}</s>`,
    underline: text => `<u>${text}</u>`,
    code: text => `<code>${text}</code>`,
  }

  return Object.keys(annotations)
    .filter(key => annotations[key])
    .reduce((result, key) => annotationMap[key]?.(result) || result, content)
}

function handleMention(mentionBlock: MentionRichTextItemResponse): string {
  const { mention } = mentionBlock
  if (!mention)
    return ''

  if (mention.type === 'user' && isFullUser(mention.user)) {
    const user = mention.user
    if (user.type === 'person') {
      return `<a href="mailto:${user.person.email}"><span><img style="width: 1em; display: inline-block" src="${user.avatar_url}" alt="${mentionBlock.plain_text}'s avatar" />${mentionBlock.plain_text}</span></a>`
    }
  }
  else if (mention.type === 'date') {
    const start = `<time datetime="${mention.date.start}">${mention.date.start}</time>`
    const end = mention.date.end ? ` ~ <time datetime="${mention.date.end}">${mention.date.end}</time>` : ''
    return start + end
  }
  else if (mention.type === 'page') {
    return `<a href="/${mention.page.id}">${mentionBlock.plain_text}</a>` // TODO: prefix with site URL according to config
  }
  else if (mention.type === 'link_mention') {
    const { link_mention: { href, link_provider, title, icon_url } } = mention
    return `<a href="${href}"><span><img style="width: 1em; display: inline-block" src="${icon_url}" ${link_provider ? `alt="${link_provider}'s favicon"` : ''}  />${title}</a>`
  }

  return ''
}

export function handleRichText(richTextList: Array<RichTextItemResponse> | undefined, plain: boolean = false): string {
  if (!richTextList || richTextList.length === 0)
    return ''
  if (plain)
    return richTextList.reduce((frag, item) => frag + item.plain_text, '')
  return richTextList.reduce((frag, item) => {
    let content = escapeHTML(item.plain_text)

    if (item.type === 'text' && item.href) {
      content = `<a href="${item.href}">${content}</a>`
    }
    else if (item.type === 'mention') {
      content = handleMention(item) || content
    }

    const { color, ...filteredAnnotations } = item.annotations
    if (!['default', 'default_background'].includes(color)) {
      const style = color.endsWith('background') ? `background-color: ${color.replace('_background', '')}` : `color: ${color}`
      content = `<mark style="${style}">${content}</mark>`
    }

    content = applyAnnotations(content, filteredAnnotations)
    return frag + content
  }, '')
}

async function handleHeading(headingBlock: Heading1BlockObjectResponse | Heading2BlockObjectResponse | Heading3BlockObjectResponse, client: Client): Promise<string> {
  const { type, id, has_children } = headingBlock
  let heading: string = ''
  if (type === 'heading_1') {
    heading = `<h1>${handleRichText(headingBlock.heading_1.rich_text)}</h1>`
  }
  else if (type === 'heading_2') {
    heading = `<h2>${handleRichText(headingBlock.heading_2.rich_text)}</h2>`
  }
  else if (type === 'heading_3') {
    heading = `<h3>${handleRichText(headingBlock.heading_3.rich_text)}</h3>`
  }
  if (!has_children)
    return heading

  const { content: headingContent } = await handleChildren(await fetchAllChildren(id, client), client)
  return `<details><summary>${heading}</summary>${headingContent}</details>`
}

async function handleTable(tableBlock: TableBlockObjectResponse, client: Client) {
  const { table: { has_column_header, has_row_header }, id } = tableBlock
  const { results } = await client.blocks.children.list({ block_id: id })

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

function handleCallout(calloutBlock: CalloutBlockObjectResponse): string {
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

async function handleListItem(listItemBlock: BulletedListItemBlockObjectResponse | NumberedListItemBlockObjectResponse, client: Client) {
  const { type, id, has_children } = listItemBlock
  const { rich_text } = type === 'bulleted_list_item' ? listItemBlock.bulleted_list_item : listItemBlock.numbered_list_item

  const content = `<span>${handleRichText(rich_text)}</span>`

  if (!has_children) {
    return `<li>${content}</li>`
  }

  const { content: childContent } = await handleChildren(await fetchAllChildren(id, client), client)
  return `<li>${content}${childContent}</li>`
}

async function handleColumnList(columnListBlock: ColumnListBlockObjectResponse, client: Client) {
  const { results } = await client.blocks.children.list({ block_id: columnListBlock.id })
  const columns = results.filter(r => isFullBlock(r) && r.type === 'column')
    .map(async (column) => {
      return `<div>${(await handleChildren(await fetchAllChildren(column.id, client), client)).content}</div>`
    })

  return `<div style="display: flex; gap: 1rem;">${await Promise.all(columns).then(cols => cols.join(''))}</div>`
}

async function handleTodo(todoBlock: ToDoBlockObjectResponse, client: Client) {
  const { id, has_children, to_do: { rich_text, checked } } = todoBlock
  const checkbox = `<input disabled type="checkbox" ${checked ? 'checked' : ''} />`
  const textContent = `<span>${handleRichText(rich_text)}</span>`

  if (!has_children) {
    return `<div style="display: flex; gap: 0.5rem;">${checkbox}${textContent}</div>`
  }

  const { content: childContent } = await handleChildren(await fetchAllChildren(id, client), client)
  return `<div style="display: flex; gap: 0.5rem; align-items: baseline">${checkbox}<div>${textContent}${childContent}</div></div>`
}

async function handleQuote(quoteBlock: QuoteBlockObjectResponse, client: Client) {
  const { quote: { rich_text }, has_children } = quoteBlock
  const content = `<span>${handleRichText(rich_text)}</span>`

  if (!has_children)
    return `<blockquote>${content}</blockquote>`

  const { content: childContent } = await handleChildren(await fetchAllChildren(quoteBlock.id, client), client)
  return `<blockquote >${content}${childContent}</blockquote>`
}

async function handleToggle(toggleBlock: ToggleBlockObjectResponse, client: Client) {
  const { toggle: { rich_text }, has_children } = toggleBlock
  const content = `<span>${handleRichText(rich_text)}</span>`

  if (!has_children)
    return `<details><summary>${content}</summary></details>`

  const { content: childContent } = await handleChildren(await fetchAllChildren(toggleBlock.id, client), client)
  return `<details><summary>${content}</summary>${childContent}</details>`
}

export async function handleChildren(allChildren: ListBlockChildrenResponse['results'], client: Client) {
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
      content.push(`\n\n\`\`\`${block.code.language}\n${handleRichText(block.code.rich_text)}\n\`\`\`\n\n`)
    }
    else if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
      content.push(await handleHeading(block, client))
    }
    else if (block.type === 'table') {
      content.push(await handleTable(block, client))
    }
    else if (block.type === 'callout') {
      content.push(handleCallout(block))
    }
    else if (block.type === 'column_list') {
      content.push(await handleColumnList(block, client))
    }
    else if (block.type === 'to_do') {
      content.push(await handleTodo(block, client))
    }
    else if (block.type === 'quote') {
      content.push(await handleQuote(block, client))
    }
    else if (block.type === 'toggle') {
      content.push(await handleToggle(block, client))
    }
    else if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
      const { result, skipCount } = await handleList(blocks.slice(i), client)
      i += skipCount
      content.push(result)
    }
  }

  return { content: content.join('\n') }
}

async function handleList(blocks: BlockObjectResponse[], client: Client) {
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

  const listHtml = await Promise.all(listItems.map(item => handleListItem(item, client)))

  const wrapperTag = listType === 'bulleted_list_item' ? 'ul' : 'ol'

  const result = `<${wrapperTag}>\n${listHtml.join('\n')}\n</${wrapperTag}>`
  return { result, skipCount: count - 1 }
}

function isListItemBlock(block: BlockObjectResponse): block is BulletedListItemBlockObjectResponse | NumberedListItemBlockObjectResponse {
  return block.type === 'bulleted_list_item' || block.type === 'numbered_list_item'
}

export async function handleProperty(query: GetPagePropertyParameters, client: Client) {
  // TODO: shounldn't query properties in this function
  const property = await client.pages.properties.retrieve(query)

  if (property.object === 'list') {
    const { results, property_item: { type } } = property
    if (type === 'title') {
      return handleRichText(results.filter(p => p.type === 'title').map(p => p.title), true)
    }
    else if (type === 'rich_text') {
      return handleRichText(results.filter(p => p.type === 'rich_text').map(p => p.rich_text))
    }
    else if (type === 'relation') {
      return results as RelationPropertyItemObjectResponse[]
    }
    else if (type === 'people') {
      return results as PeoplePropertyItemObjectResponse[]
    }
    else if (type === 'rollup' && property.property_item.type === 'rollup') {
      const { rollup } = property.property_item
      return { rollup, results }
    }
  }
  return property as PropertyItemObjectResponse
}

export async function fetchAllChildren(id: string, client: Client) {
  const allResults: ListBlockChildrenResponse['results'] = []
  let cursor: string | undefined

  while (true) {
    const response = await client.blocks.children.list({
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

export type RecordValueOf<T> = T extends Record<string, infer U> ? U : never
type ValueOf<T> = T[keyof T]
type OmitId<T> = T extends any ? Omit<T, 'id'> : never
type PageProperties = PageObjectResponse['properties']
type PagePropertyValue = ValueOf<PageProperties>
type PagePropertyValueWithoutId = OmitId<PagePropertyValue>

export type PagePropertiesType<T extends PagePropertyValueWithoutId = PagePropertyValueWithoutId> = Array<{ label: string, value: T }>
export type PageMetaType = Omit<PageObjectResponse, 'properties' | 'id' | 'object'> & { title: string }

type DatabaseProperties = DatabaseObjectResponse['properties']
type DatabasePropertyValue = ValueOf<DatabaseProperties>
type DatabasePropertyValueWithoutId = OmitId<DatabasePropertyValue>

export type DatabasePropertiesType<T extends DatabasePropertyValueWithoutId = DatabasePropertyValueWithoutId> = Array<{ label: string, value: T }>
export type DatabaseMetaType = Partial<Omit<DatabaseObjectResponse, 'properties' | 'id' | 'object' | 'title'> & { title: string }>
