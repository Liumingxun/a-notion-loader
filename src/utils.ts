import type { MentionRichTextItemResponse, PageObjectResponse, RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints.d.ts'
import { isFullUser } from '@notionhq/client'
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

function handleMention(item: MentionRichTextItemResponse): string {
  const { mention } = item
  if (!mention)
    return ''

  if (mention.type === 'user' && isFullUser(mention.user)) {
    const user = mention.user
    if (user.type === 'person') {
      return `<a href="mailto:${user.person.email}"><span><img style="width: 1em; display: inline-block" src="${user.avatar_url}" alt="${item.plain_text}'s avatar" />${item.plain_text}</span></a>`
    }
  }
  else if (mention.type === 'date') {
    const start = `<time datetime="${mention.date.start}">${mention.date.start}</time>`
    const end = mention.date.end ? ` ~ <time datetime="${mention.date.end}">${mention.date.end}</time>` : ''
    return start + end
  }
  else if (mention.type === 'page') {
    return `<a href="/${mention.page.id}">${item.plain_text}</a>` // TODO: prefix with site URL according to config
  }

  return ''
}

export function reduceRichText(richTextList: Array<RichTextItemResponse> | undefined): string {
  if (!richTextList || richTextList.length === 0)
    return ''
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

type PageProperties = PageObjectResponse['properties']
type ValueOf<T> = T[keyof T]
type PagePropertyValue = ValueOf<PageProperties>

export type PropertiesType<T extends PagePropertyValue = PagePropertyValue> = Array<{ label: string, value: T }>
export type MetaType = Partial<Omit<PageObjectResponse, 'properties' | 'id' | 'object'> & {
  title: string
}>
