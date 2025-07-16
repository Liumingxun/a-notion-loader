# Astro Notion Loader

Astro Notion Loader 允许你从 Notion 载入数据，为你的 Astro 内容集合提供数据源。

## 安装

| package manager |             command              |
| :-------------: | :------------------------------: |
|       npm       |    npm i astro-notion-loader     |
|      pnpm       |   pnpm add astro-notion-loader   |
|       bun       |   bun add astro-notion-loader    |
|      deno       | deno add npm:astro-notion-loader |

## 使用方法

0. 参考 [Astro 内容集合指南](https://docs.astro.build/en/guides/content-collections/#defining-collections) 初始化 `src/content.config.ts` 文件
1. 导入 `astro-notion-loader`

   ```ts
   import { defineCollection } from 'astro:content'
   import { notionLoader } from 'notion-loader'

   const notionFromPage = defineCollection({
     loader: notionLoader({
       auth: import.meta.env.NOTION_KEY
     }, {
       page_id: import.meta.env.PAGE_ID,
     }),
   })

   export const collections = {
     notionFromPage,
   }
   ```

2. 运行 `astro sync`
3. 在 Astro 页面中使用

   ```astro
   ---
   const notionPages = await getCollection('notionFromPage') // 具有类型推断

   export async function getStaticPaths() {
     return notionPages.map((post) => ({
       params: { slug: post.id },
       props: post,
     }))
   }
   const post = Astro.props
   const { Content } = await render(post)
   ---

   <Content />
   ```

## 配置

0. 根据 [Notion 集成指南](https://developers.notion.com/docs/create-a-notion-integration#create-your-integration-in-notion) 创建一个 Internal 集成
1. 在 **Configuration Tab** 中获取 **_Internal Integration Secret_**
2. 将 **_Internal Integration Secret_** 写入项目环境变量 `NOTION_KEY`
3. 在 **Capabilities** 中至少赋予集成 **_Read Content_** 能力
4. 在 **Access Tab** 中通过 **_Edit Access_** 选择可以访问的页面或数据库
5. 通过 [环境变量](https://docs.astro.build/en/guides/environment-variables/#type-safe-environment-variables) `NOTION_KEY` 提供 `notionLoader` 的 `auth` 参数
6. 通过环境变量或其他方式为 `notionLoader` 提供 `pageId` 或 `databaseId`
