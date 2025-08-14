import type { PropertySignature } from 'ts-morph'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'bun'
import { Project } from 'ts-morph'

const originalPath = fileURLToPath(import.meta.resolve('@notionhq/client/build/src/api-endpoints.d.ts'))
const extractTypesPath = resolve(import.meta.dirname, 'notion-extract.d.ts')

const project = new Project()
const sourceFile = project.addSourceFileAtPath(originalPath)
const extractSourceFile = project.createSourceFile(extractTypesPath, '', { overwrite: true })

sourceFile.addStatements(`
type ValueOf<T> = T[keyof T]
type PageProperties = PageObjectResponse['properties']
type PagePropertyValue = ValueOf<PageProperties>`)

const decl = sourceFile.getTypeAliasOrThrow('PagePropertyValue')
const type = decl.getType()

decl.setType(type.getText(decl))
extractSourceFile.addTypeAlias(decl.getStructure())

type.getSymbolOrThrow().getDeclarations()
type.getUnionTypes().flatMap(t => t.getProperties()
  .filter(prop => !['type', 'id'].includes(prop.getName()))
  .flatMap(prop => prop.getDeclarations()) as PropertySignature[])

project.saveSync()
