import type { Loader } from 'astro/loaders'
import { z } from 'astro:content'
import { createNotionCtx } from './createNotionCtx'

export function notionLoader({ auth, block_id }: { auth: string, block_id: string }): Loader {
  return {
    name: 'notion-loader',
    load: async ({ store }) => {
      const { queryPage } = createNotionCtx({
        auth,
      })
      const { id, content, meta, properties } = await queryPage({
        block_id,
      })

      store.set({
        id,
        data: {
          ...meta,
          properties,
        },
        body: content,
        rendered: {
          html: content,
        },
      })
    },
  }
}

export { notionLoader as default }
