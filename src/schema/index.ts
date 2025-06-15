import { z } from 'astro/zod'

export const pageSchema = z.object({
  id: z.string().uuid(),
  created_time: z.string().datetime(),
  last_edited_time: z.string().datetime(),
  url: z.string().url(),
  public_url: z.string().url().optional(),
  title: z.string(),
}).passthrough()
