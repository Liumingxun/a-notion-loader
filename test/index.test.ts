import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process, { loadEnvFile } from 'node:process'
import { Client } from '@notionhq/client'
import { expect, it } from 'vitest'
import { handleChildren } from '../src/utils'

loadEnvFile('.env')

const client = new Client({
  auth: process.env.NOTION_KEY,
})

const TEST_CASE_JSON_PATH = resolve(import.meta.dirname, './test_case.json')

if (!existsSync(TEST_CASE_JSON_PATH)) {
  const children = await client.blocks.children.list({
    block_id: process.env.TEST_CASE_PAGE_ID,
  })
  writeFileSync(TEST_CASE_JSON_PATH, JSON.stringify(children, null, 2))
}

const children = JSON.parse(readFileSync(TEST_CASE_JSON_PATH, 'utf-8'))
it('handle children', {
  timeout: 120_000,
}, async () => {
  expect((await handleChildren(children, client)).content).toMatchSnapshot()
})
