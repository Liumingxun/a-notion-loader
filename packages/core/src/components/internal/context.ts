import type { RenderContext } from '../../types'

let context: RenderContext

export function setRenderContext(ctx: RenderContext) {
  context = ctx
}

export function getRenderContext() {
  if (!context)
    throw new Error('RenderContext not set')
  return context
}
