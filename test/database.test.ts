import process, { loadEnvFile } from 'node:process'
import { expect, it } from 'vitest'
import { createNotionCtx } from '../src/createNotionCtx'

loadEnvFile('.env')

const { queryDatabase } = createNotionCtx({
  auth: process.env.NOTION_KEY,
})

// very bad test
it('should query database', {
  timeout: 60_000,
}, async () => {
  const { entries, id, meta, properties } = await queryDatabase({
    database_id: process.env.TEST_CASE_DATABASE_ID,
  })

  expect(entries).toMatchSnapshot()
  expect(id).toMatchSnapshot()
  expect(meta).toMatchSnapshot()
  expect(properties).toMatchSnapshot()
})
