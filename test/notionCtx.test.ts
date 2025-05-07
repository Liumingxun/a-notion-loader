import process, { loadEnvFile } from 'node:process'
import { expect, it } from 'vitest'
import { createNotionCtx } from '../src/createNotionCtx'

loadEnvFile('.env')

const { queryPage } = createNotionCtx({
  auth: process.env.NOTION_KEY,
})

it('query page', async () => expect(await queryPage({
  block_id: '155e149e1db180faa626cc4be4bd54de',
})).toMatchSnapshot())
