import type { ExtractBlock } from '../types'
import { handleRichText } from '../utils'
import Toggle from './Toggle'

function isToggleableHeading(headingBlock: ExtractBlock<'heading_1' | 'heading_2' | 'heading_3'>): boolean {
  const { type } = headingBlock

  if (type === 'heading_1')
    return headingBlock.heading_1.is_toggleable
  if (type === 'heading_2')
    return headingBlock.heading_2.is_toggleable
  if (type === 'heading_3')
    return headingBlock.heading_3.is_toggleable

  return false
}

function getHeadingText(headingBlock: ExtractBlock<'heading_1' | 'heading_2' | 'heading_3'>): string {
  const { type } = headingBlock

  if (type === 'heading_1')
    return `# ${handleRichText(headingBlock.heading_1.rich_text)}`
  if (type === 'heading_2')
    return `## ${handleRichText(headingBlock.heading_2.rich_text)}`
  if (type === 'heading_3')
    return `### ${handleRichText(headingBlock.heading_3.rich_text)}`

  return ''
}

export default (block: ExtractBlock<'heading_1' | 'heading_2' | 'heading_3'>) => {
  if (isToggleableHeading(block))
    return Toggle(block)

  return getHeadingText(block)
}
