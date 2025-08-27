import { z } from 'astro/zod'

export const pageSchema = z.object({
  created_time: z.string().datetime(),
  last_edited_time: z.string().datetime(),
  url: z.string().url(),
  public_url: z.string().url().nullable(),
  title: z.string(),
  properties: z.record(z.unknown()),
  blocks: z.array(z.unknown()).optional(),
})
