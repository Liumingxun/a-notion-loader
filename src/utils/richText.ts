import type { MentionRichTextItemResponse, RichTextItemResponse, RichTextItemResponseCommon } from '@notionhq/client/build/src/api-endpoints.d.ts'
import { isFullUser } from '@notionhq/client'
import { isMentionRichTextItemResponse } from '@notionhq/client/build/src/helpers'
import { escapeHTML } from '.'

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

function handleMention(mentionBlock: RichTextItemResponseCommon & MentionRichTextItemResponse): string {
  const { mention } = mentionBlock

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

    if (isMentionRichTextItemResponse(item)) {
      content = handleMention(item) || content
    }
    else if (item.type === 'text') {
      if (item.href)
        content = `<a href="${item.href}">${content}</a>`
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
