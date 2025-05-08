import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'
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

const notion = defineCollection({
  loader: notionLoader({
    auth: import.meta.env.NOTION_KEY,
    block_id: '155e149e1db180faa626cc4be4bd54de',
  }),
  schema: z.object({}),
})

export const collections = {
  blog,
  notion,
}
