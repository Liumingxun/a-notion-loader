import { LogLevel } from '@notionhq/client'
import { notionLoader } from 'a-notion-loader'
import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'
import { NOTION_KEY } from 'astro:env/server'

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
  logger(level, message, extraInfo) {
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
    database_id: '24be149e1db18099bb4ed9458b1f91dd',
  }),
})

export const collections = {
  blog,
  notionFromPage,
  notionFromDatabase,
}
