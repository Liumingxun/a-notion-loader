import type { BlockObjectResponse } from '@notionhq/client'
import type { ToggleBlockObjectResponse } from '@notionhq/client/build/src/api-endpoints'

export { handleRichText } from './richText'
export { unescapeHTML } from 'astro/compiler-runtime'
export { escapeHTML } from 'astro/runtime/server/escape.js'

export function isToggleBlock(block: BlockObjectResponse): block is ToggleBlockObjectResponse {
  return block.type === 'toggle'
}
