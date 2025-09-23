import type { ClassDeclaration, EnumDeclaration, InterfaceDeclaration, Project, SourceFile, TypeAliasDeclaration } from 'ts-morph'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { Node, SyntaxKind } from 'ts-morph'

type TopLevelDecl
  = | TypeAliasDeclaration
    | InterfaceDeclaration
    | EnumDeclaration
    | ClassDeclaration

function isFromTsDefaultLib(filePath: string) {
  return /[\\/]typescript[\\/]lib[\\/].+\.d\.ts$/.test(filePath)
}

function isBuiltInTypeNode(node: Node): boolean {
  const type = node.getType()

  const symbol = type.getAliasSymbol() ?? type.getSymbol()
  if (symbol) {
    const decls = symbol.getDeclarations()
    if (decls.length > 0) {
      return decls.some(d => isFromTsDefaultLib(d.getSourceFile().getFilePath()))
    }
  }
  return false
}

export function extractWithDeps(project: Project, targetNames: string[]) {
  const sourceFiles = project.getSourceFiles()

  const extractFile = project.createSourceFile(resolve(tmpdir(), 'extracted.d.ts'), '', {
    overwrite: true,
  })

  // Lookup function for top-level decl by name (in a given file)
  const getTopLevelInFile = (sf: SourceFile, name: string): TopLevelDecl | undefined => {
    return (
      sf.getTypeAlias(name)
      || sf.getInterface(name)
      || sf.getEnum(name)
      || sf.getClass(name)
    )
  }

  const getTopLevelAny = (name: string): [SourceFile, TopLevelDecl] | undefined => {
    for (const sf of sourceFiles) {
      const d = getTopLevelInFile(sf, name)
      if (d)
        return [sf, d]
    }
    return undefined
  }

  // Collect type parameter names from a declaration
  const getTypeParamNames = (decl: TopLevelDecl): Set<string> => {
    if (Node.isEnumDeclaration(decl))
      return new Set()
    // Only type aliases, interfaces, classes have type params
    const params = decl.getTypeParameters()
    return new Set(params.map(p => p.getName()))
  }

  // Collect referenced type names from a node
  const collectTypeRefs = (node: Node, excludeNames: Set<string>, bag: Set<string>) => {
    node.forEachDescendant((d) => {
      const kind = d.getKind()
      if (kind === SyntaxKind.TypeReference) {
        const typeRef = d.asKindOrThrow(SyntaxKind.TypeReference)
        const tn = typeRef.getTypeName()
        const name = tn.getText()
        if (!excludeNames.has(name) && !isBuiltInTypeNode(typeRef)) {
          bag.add(name)
        }
      }
    })
  }

  // Worklist: start from targets
  const neededNames = new Set<string>(targetNames)
  const queue: string[] = [...targetNames]

  // BFS over dependencies
  while (true) {
    const name = queue.shift()
    if (!name)
      break

    const pair = getTopLevelAny(name)
    if (!pair) {
      // Not found in project; could be built-in or an imported type-alias from .d.ts externals
      continue
    }
    const [, decl] = pair
    const exclude = getTypeParamNames(decl)
    // Also exclude the declaration's own name to avoid self-capture
    exclude.add(name)

    const deps = new Set<string>()
    collectTypeRefs(decl, exclude, deps)

    for (const dep of deps) {
      if (!neededNames.has(dep)) {
        neededNames.add(dep)
        queue.push(dep)
      }
    }
  }

  // Now copy declarations into extractFile, preserving a stable order: first the dependencies (excluding targets), then targets.
  const depNames = [...neededNames].filter(n => !targetNames.includes(n))
  const ordered = [...depNames, ...targetNames]

  extractFile.addStatements(ordered.map((name) => {
    const pair = getTopLevelAny(name)
    if (!pair)
      return undefined
    const [, decl] = pair
    return decl.getStructure()
  }).filter(v => !!v))

  return extractFile
}
