import { Node } from 'ts-morph'

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

export function collect(node: Node, deps: Set<string> = new Set()) {
  if (deps.has(node.getText())) {
    return
  }

  switch (true) {
    case Node.isTypeReference(node):
    case Node.isIdentifier(node):
      {
        if (!isBuiltInTypeNode(node))
          deps.add(node.getText())
        const symbol = node.getType().getAliasSymbol() ?? node.getType().getSymbol()
        if (symbol) {
          symbol.getDeclarations()
            // Identifier needed to be filtered out, exclude: Array...
            .filter(decl => !Node.isIdentifier(node) || !isBuiltInTypeNode(decl))
            .forEach((decl) => {
              collect(decl, deps)
            })
        }
      }
      break
    case Node.isTypeAliasDeclaration(node):
    case Node.isPropertySignature(node):
    case Node.isParenthesizedTypeNode(node):
      node.getTypeNode()?.forEachChild(child => collect(child, deps))
      break
    case Node.isUnionTypeNode(node):
    case Node.isIntersectionTypeNode(node):
      node.getTypeNodes()?.forEach(child => collect(child, deps))
      break
    case Node.isTypeLiteral(node):
      node.getProperties().forEach(prop => collect(prop, deps))
      break
    case Node.isLiteralTypeNode(node):
      collect(node.getLiteral(), deps)
      break
    case Node.isStringLiteral(node):
    case Node.isBooleanKeyword(node):
    case Node.isNumberKeyword(node):
    case Node.isStringKeyword(node):
    case Node.isNullLiteral(node):
    case Node.isNeverKeyword(node):
    case Node.isTrueLiteral(node):
    case Node.isTypeParameterDeclaration(node):
      noop()
      break
    default:
      throw new Error(`Unhandled: ${node.getKindName()} ${node.getSymbol()?.getName()}`)
  }
}

function noop() {}
