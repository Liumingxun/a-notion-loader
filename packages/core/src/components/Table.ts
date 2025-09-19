import type { ExtractBlock } from '../types'
import { isFullBlock } from '@notionhq/client'
import { handleRichText } from '../utils'

export default (block: ExtractBlock<'table'>) => {
  const { table: { has_column_header, has_row_header } } = block

  const rows = block.children!.filter(r => isFullBlock(r) && r.type === 'table_row').map(r => r.table_row.cells)

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
