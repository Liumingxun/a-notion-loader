#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Project } from 'ts-morph'
import { generate } from 'ts-to-zod'
import { extractWithDeps } from '../src/extract'

const originalPath = fileURLToPath(import.meta.resolve('@notionhq/client/build/src/api-endpoints.d.ts'))

const project = new Project()
const sourceFile = project.addSourceFileAtPath(originalPath)

sourceFile.addStatements(`
type ValueOf<T> = T[keyof T]
type PageProperties = PageObjectResponse['properties']
export type PagePropertyValue = ValueOf<PageProperties>`)

const decl = sourceFile.getTypeAliasOrThrow('PagePropertyValue')
const type = decl.getType()

decl.setType(type.getText(decl)).addJsDoc(`@discriminator type`)

const notionZodFilePath = resolve(import.meta.dirname, './property.notion.zod.ts')

if (import.meta.main) {
  const sourceText = extractWithDeps(project, ['PagePropertyValue']).getFullText()

  writeFileSync(notionZodFilePath, generate({
    sourceText,
  }).getZodSchemasFile('')
    .replace(
      'import { z } from "zod";',
      'import { z } from "astro/zod"',
    ))
}
