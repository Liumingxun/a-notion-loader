import { defineWorkspace } from 'bunup'
import { copy } from 'bunup/plugins'

export default defineWorkspace([
  {
    name: 'nzodify',
    root: 'packages/nzodify',
    config: {
      entry: 'bin/index.ts',
      plugins: [
        copy('./dist/index.js', '../../dist/nzodify.js'),
      ],
    },
  },
  {
    name: 'core',
    root: 'packages/core',
    config: [
      {
        entry: ['src/index.ts', 'src/utils/index.ts'],
        format: ['cjs', 'esm'],
        plugins: [
          copy('./src/components/*', './dist/components'),
        ],
        onSuccess: 'cp -r ./packages/core/dist ./',
      },
    ],
  },
])
