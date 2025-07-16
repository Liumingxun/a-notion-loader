import { LogLevel } from '@notionhq/client'
import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'
import { NOTION_KEY } from 'astro:env/server'
import { notionLoader } from 'notion-loader'

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Transform string to Date object
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
  }),
})

const clientOpts: Parameters<typeof notionLoader>['0'] = {
  auth: NOTION_KEY,
  logger(level: LogLevel, message: string, extraInfo: Record<string, unknown>) {
    console.log(`${`[${level}]`.padStart(8)}: ${message}\n\t  ${JSON.stringify(extraInfo)}`)
  },
  logLevel: LogLevel.DEBUG,
}

const notionFromPage = defineCollection({
  loader: notionLoader(clientOpts, {
    page_id: '198e149e1db18010bfc0f9d7fdd80ca2',
  }),
})
const notionFromDatabase = defineCollection({
  loader: notionLoader(clientOpts, {
    database_id: '1dfe149e1db180d3bd9ad2e270349d0a',
  }),
})

export const collections = {
  blog,
  notionFromPage,
  notionFromDatabase,
}
