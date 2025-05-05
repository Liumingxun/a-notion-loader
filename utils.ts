import type { ParagraphBlockObjectResponse } from '@notionhq/client/build/src/api-endpoints'

export function reduceParagraph(cur: ParagraphBlockObjectResponse) {
  return cur.paragraph.rich_text.reduce((mdText, item) => {
    if (item.type === 'text') {
      let content = item.plain_text
      const href = item.href
      const color = item.annotations.color === 'default' ? '' : item.annotations.color
      const annotations = (Object.keys(item.annotations) as ('bold' | 'italic' | 'strikethrough' | 'underline' | 'code')[])
        .filter(v => typeof item.annotations[v] === 'boolean' && item.annotations[v] === true)
      if (href) {
        content = `<a href="${href}">${content}</a>`
      }
      if (color) {
        content = `<mark color="${color}">${content}</mark>`
      }
      if (annotations.length) {
        content = annotations.reduce((mark, annotation) => {
          if (annotation === 'bold') {
            mark = `<strong>${mark}</strong>`
          }
          else if (annotation === 'italic') {
            mark = `<em>${mark}</em>`
          }
          else if (annotation === 'strikethrough') {
            mark = `<s>${mark}</s>`
          }
          else if (annotation === 'underline') {
            mark = `<u>${mark}</u>`
          }
          else if (annotation === 'code') {
            mark = `<code>${mark}</code>`
          }
          return mark
        }, content)
      }
      mdText += content
    }
    else if (item.type === 'mention') {
      let content = item.plain_text

      if (item.mention.type === 'date') {
        content = item.mention.date.start
      }

      mdText += content
    }

    return mdText
  }, '')
}
