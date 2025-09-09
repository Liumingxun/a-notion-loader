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
export type PageProperty = ValueOf<PageProperties>

export type PageBlock = ListBlockChildrenResponse['results']`)

const propertyDecl = sourceFile.getTypeAliasOrThrow('PageProperty')
const propertyType = propertyDecl.getType()
propertyDecl.setType(propertyType.getText(propertyDecl)).addJsDoc(`@discriminator type`)

const blockDecl = sourceFile.getTypeAliasOrThrow('BlockObjectResponse')
blockDecl.addJsDoc(`@discriminator type`)
const pageBlockDecl = sourceFile.getTypeAliasOrThrow('PageBlock')
const pageBlockType = pageBlockDecl.getType()
pageBlockDecl.setType(pageBlockType.getText(sourceFile))

const propertyZodFilePath = resolve(import.meta.dirname, './property.notion.zod.ts')
const blockZodFilePath = resolve(import.meta.dirname, './block.notion.zod.ts')

if (import.meta.main) {
  const propertySourceText = extractWithDeps(project, ['PageProperty']).getFullText()
  writeFileSync(propertyZodFilePath, generate({
    sourceText: propertySourceText,
  }).getZodSchemasFile('')
    .replace(
      'import { z } from "zod";',
      'import { z } from "astro/zod"',
    ))

  const blockSourceText = extractWithDeps(project, ['PageBlock']).getFullText()
  writeFileSync(blockZodFilePath, generate({
    sourceText: blockSourceText,
  }).getZodSchemasFile('')
    .replace(
      'import { z } from "zod";',
      'import { z } from "astro/zod"',
    ))
}
