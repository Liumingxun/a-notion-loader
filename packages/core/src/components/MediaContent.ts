import type { AudioBlockObjectResponse, ImageBlockObjectResponse, PdfBlockObjectResponse, VideoBlockObjectResponse } from '@notionhq/client'
import { handleRichText } from '../utils'

export default (block: ImageBlockObjectResponse | VideoBlockObjectResponse | AudioBlockObjectResponse | PdfBlockObjectResponse) => {
  let url = ''
  let alt = ''
  let caption = ''
  if (block.type === 'image') {
    url = block.image.type === 'external' ? block.image.external.url : block.image.file.url
    alt = block.image.caption ? handleRichText(block.image.caption) : ''
    caption = alt ? `<figcaption>${alt}</figcaption>` : ''
    return `<figure><img src="${url}" alt="${alt}"/>${caption}</figure>`
  }
  else if (block.type === 'video') {
    url = block.video.type === 'external' ? block.video.external.url : block.video.file.url
    alt = block.video.caption ? handleRichText(block.video.caption) : ''
    caption = alt ? `<figcaption>${alt}</figcaption>` : ''
    return `<figure><video src="${url}" controls/>${caption}</figure>`
  }
  else if (block.type === 'audio') {
    url = block.audio.type === 'external' ? block.audio.external.url : block.audio.file.url
    alt = block.audio.caption ? handleRichText(block.audio.caption) : ''
    caption = alt ? `<figcaption>${alt}</figcaption>` : ''
    return `<figure><audio src="${url}" controls/>${caption}</figure>`
  }
  else if (block.type === 'pdf') {
    url = block.pdf.type === 'external' ? block.pdf.external.url : block.pdf.file.url
    alt = block.pdf.caption ? handleRichText(block.pdf.caption) : ''
    caption = alt ? `<figcaption>${alt}</figcaption>` : ''
    return `<figure><embed src="${url}" type="application/pdf" width="100%" height="600px"/>${caption}</figure>`
  }
  return ''
}
