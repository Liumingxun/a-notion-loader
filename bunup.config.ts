import { defineConfig } from 'bunup'

export default defineConfig([
  {
    entry: './src/index.ts',
    format: ['cjs', 'esm'],
    splitting: true,
    dts: true,
  },
  {
    entry: './scripts/zodify.ts',
    splitting: true,
  },
])
