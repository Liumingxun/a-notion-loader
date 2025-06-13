import process, { loadEnvFile } from 'node:process'
import { expect, it } from 'vitest'
import { createNotionCtx } from '../src/createNotionCtx'

loadEnvFile('.env')

const { queryEntriesFromDatabase } = createNotionCtx({
  auth: process.env.NOTION_KEY,
})

// very bad test
it.skip('should query database', {
  timeout: 60_000,
}, async () => {
  const entries = await queryEntriesFromDatabase({
    database_id: process.env.TEST_CASE_DATABASE_ID,
  })

  expect(entries).toMatchSnapshot()
})
