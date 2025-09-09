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
export type PageProperty = ValueOf<PageProperties>`)

const propertyDecl = sourceFile.getTypeAliasOrThrow('PageProperty')
const propertyType = propertyDecl.getType()

propertyDecl.setType(propertyType.getText(propertyDecl)).addJsDoc(`@discriminator type`)

const propertyZodFilePath = resolve(import.meta.dirname, './property.notion.zod.ts')

if (import.meta.main) {
  const propertySourceText = extractWithDeps(project, ['PageProperty']).getFullText()

  writeFileSync(propertyZodFilePath, generate({
    sourceText: propertySourceText,
  }).getZodSchemasFile('')
    .replace(
      'import { z } from "zod";',
      'import { z } from "astro/zod"',
    ))
}
