import { z } from 'astro/zod'

export const pageSchema = z.object({
  created_time: z.string().datetime(),
  last_edited_time: z.string().datetime(),
  url: z.string().url(),
  public_url: z.string().url().nullable(),
  title: z.string(),
  properties: z.array(z.object({ label: z.string(), value: z.unknown() })),
}).passthrough()
