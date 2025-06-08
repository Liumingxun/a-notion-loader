// @notionhq/client/build/src/api-endpoints.d.ts
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generate } from 'ts-to-zod'

const originalTypesPath = fileURLToPath(import.meta.resolve('@notionhq/client/build/src/api-endpoints.d.ts'))

const originalContent = await readFile(originalTypesPath, 'utf-8')
const lines = originalContent.split('\n')

const pattern = /(?!.*Partial)type.*Response[^\n\r|\u2028\u2029]*\|.*Response.*$/

const injectedComment = `/**\n * @discriminator type\n */`

const updatedLines: string[] = []

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]

  if (pattern.test(line.trim())) {
    updatedLines.push(injectedComment)
  }

  updatedLines.push(line)
}

const notionZodFilePath = resolve(import.meta.dirname, '../src/schema/notion.zod.ts')

await writeFile(
  notionZodFilePath,
  generate({
    sourceText: updatedLines.join('\n'),
  }).getZodSchemasFile('')
    .replace(
      'import { z } from "zod";',
      'import { z } from "astro/zod"',
    )
    .replace(
      'z.discriminatedUnion("type", [propertyItemObjectResponseSchema, propertyItemListResponseSchema]);',
      'z.discriminatedUnion("type", [...propertyItemObjectResponseSchema.options, propertyItemListResponseSchema]);',
    ),
  'utf-8',
)
