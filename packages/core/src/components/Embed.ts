import type { ExtractBlock } from '../types'
import { handleRichText } from '../utils'

export default (block: ExtractBlock<'embed' | 'bookmark'>) => {
  let url: string = ''
  let caption: string = ''

  if (block.type === 'bookmark') {
    url = block.bookmark.url
    caption = block.bookmark.caption.length > 0 ? handleRichText(block.bookmark.caption) : ''
  }
  else if (block.type === 'embed') {
    url = block.embed.url
    caption = block.embed.caption.length > 0 ? handleRichText(block.embed.caption) : ''
  }

  return `<figure><a href="${url}" target="_blank" rel="noopener noreferrer">${caption}</a></figure>`
}
