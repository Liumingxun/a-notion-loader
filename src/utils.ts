import type { Client } from '@notionhq/client'
import type { BulletedListItemBlockObjectResponse, CalloutBlockObjectResponse, ColumnListBlockObjectResponse, Heading1BlockObjectResponse, Heading2BlockObjectResponse, Heading3BlockObjectResponse, ListBlockChildrenResponse, MentionRichTextItemResponse, NumberedListItemBlockObjectResponse, PageObjectResponse, RichTextItemResponse, TableBlockObjectResponse, ToDoBlockObjectResponse } from '@notionhq/client/build/src/api-endpoints.d.ts'
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
  const { type, id } = headingBlock
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
  if (headingBlock.has_children) {
    const children = await client.blocks.children.list({ block_id: id })
    const { content: headingContent } = await handleChildren(children, client)
    heading = `<details><summary>${heading}</summary>${headingContent}</details>`
  }
  return heading
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

  const text = handleRichText(rich_text)
  return `<div style="display: flex; padding: 0.5rem; align-items: baseline; gap: 0.25rem;">${iconHTML}<div>${text}</div></div>`
}

async function handleListItem(listItemBlock: BulletedListItemBlockObjectResponse | NumberedListItemBlockObjectResponse, client: Client) {
  const { type, id, has_children } = listItemBlock
  const { rich_text } = type === 'bulleted_list_item' ? listItemBlock.bulleted_list_item : listItemBlock.numbered_list_item

  const content = `<span>${handleRichText(rich_text)}</span>`

  if (!has_children) {
    return `<div style="display: list-item; list-style-position: inside">${content}</div>`
  }

  const children = await client.blocks.children.list({ block_id: id })
  const { content: childContent } = await handleChildren(children, client)
  return `<div style="display: flex"><div style="display: list-item; list-style-position: inside"></div><div>${content}<div>${childContent}</div></div></div>`
}

async function handleColumnList(columnListBlock: ColumnListBlockObjectResponse, client: Client) {
  const { results } = await client.blocks.children.list({ block_id: columnListBlock.id })
  const columns = results.filter(r => isFullBlock(r) && r.type === 'column')
    .map(async (column) => {
      const columnChildren = await client.blocks.children.list({ block_id: column.id })
      return `<div>${(await handleChildren(columnChildren, client)).content}</div>`
    })

  return `<div style="display: flex; gap: 1rem;">${await Promise.all(columns).then(cols => cols.join(''))}</div>`
}

async function handleTodo(todoBlock: ToDoBlockObjectResponse, client: Client) {
  const { id, has_children, to_do: { rich_text, checked } } = todoBlock
  const checkbox = `<input disabled type="checkbox" ${checked ? 'checked' : ''} />`
  const textContent = handleRichText(rich_text)

  if (!has_children) {
    return `<div style="display: flex; gap: 0.5rem;">${checkbox}${textContent}</div>`
  }

  const children = await client.blocks.children.list({ block_id: id })
  const { content: childContent } = await handleChildren(children, client)
  return `<div style="display: flex; gap: 0.5rem; align-items: baseline">${checkbox}<div>${textContent}${childContent}</div></div>`
}

export async function handleChildren({ results }: ListBlockChildrenResponse, client: Client) {
  const content: string[] = []
  for (const block of results.filter(r => isFullBlock(r))) {
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
    else if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
      content.push(await handleListItem(block, client))
    }
    else if (block.type === 'column_list') {
      content.push(await handleColumnList(block, client))
    }
    else if (block.type === 'to_do') {
      content.push(await handleTodo(block, client))
    }
  }
  return { content: content.join('\n') }
}

type PageProperties = PageObjectResponse['properties']
type ValueOf<T> = T[keyof T]
type PagePropertyValue = ValueOf<PageProperties>
type OmitId<T> = T extends any ? Omit<T, 'id'> : never
type PagePropertyValueWithoutId = OmitId<PagePropertyValue>

export type PropertiesType<T extends PagePropertyValueWithoutId = PagePropertyValueWithoutId> = Array<{ label: string, value: T }>
export type MetaType = Partial<Omit<PageObjectResponse, 'properties' | 'id' | 'object'> & {
  title: string
}>
