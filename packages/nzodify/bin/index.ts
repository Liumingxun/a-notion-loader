#!/usr/bin/env node
import { rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Project } from 'ts-morph'
import { generate } from 'ts-to-zod'
import { collect } from '../utils'

const originalPath = fileURLToPath(import.meta.resolve('@notionhq/client/build/src/api-endpoints.d.ts'))
const extractTypesPath = resolve(tmpdir(), 'notion-extracted-property.d.ts')

const project = new Project()
const sourceFile = project.addSourceFileAtPath(originalPath)
const extractSourceFile = project.createSourceFile(extractTypesPath, '', { overwrite: true })

sourceFile.addStatements(`
type ValueOf<T> = T[keyof T]
type PageProperties = PageObjectResponse['properties']
export type PagePropertyValue = ValueOf<PageProperties>`)

const decl = sourceFile.getTypeAliasOrThrow('PagePropertyValue')
const type = decl.getType()

decl.setType(type.getText(decl)).addJsDoc(`@discriminator type`)
extractSourceFile.addTypeAlias(decl.getStructure())

const deps = new Set<string>()
collect(decl, deps)
extractSourceFile.addStatements(
  sourceFile.forEachChildAsArray().filter((node) => {
    const symbol = node.getSymbol()
    if (symbol)
      return deps.has(symbol.getName())
    return false
  }).map(node => node.getText()),
)

extractSourceFile.saveSync()

const notionZodFilePath = resolve(import.meta.dirname, './property.notion.zod.ts')

async function main() {
  await writeFile(
    notionZodFilePath,
    generate({
      sourceText: extractSourceFile.getFullText(),
    }).getZodSchemasFile('')
      .replace(
        'import { z } from "zod";',
        'import { z } from "astro/zod"',
      ),
    'utf-8',
  )

  await rm(extractTypesPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
