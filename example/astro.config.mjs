// @ts-check
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, envField } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  markdown: {
    shikiConfig: {
      theme: 'catppuccin-latte',
      defaultColor: false,
    },
  },
  env: {
    schema: {
      NOTION_KEY: envField.string({
        context: 'server',
        access: 'secret',
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
