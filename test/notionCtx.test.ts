import process, { loadEnvFile } from 'node:process'
import { expect, it } from 'vitest'
import { createNotionCtx } from '../src/createNotionCtx'

loadEnvFile('.env')

const { queryPage } = createNotionCtx({
  auth: process.env.NOTION_KEY,
})

const page = queryPage({
  block_id: '1eae149e1db18052886ae47d967a0cb8',
})

it('query page content', async () => expect((await page).content).toMatchSnapshot())
it('query page properties', async () => expect((await page).properties).toMatchSnapshot())
it('query page meta', async () => expect((await page).meta).toMatchSnapshot())
