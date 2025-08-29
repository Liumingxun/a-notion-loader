import { defineWorkspace } from 'bunup'

export default defineWorkspace([
  {
    name: 'nzodify',
    root: 'packages/nzodify',
    config: {
      entry: 'bin/index.ts',
      outDir: '../../dist/nzodify',
    },
  },
], {
  splitting: true,
})
