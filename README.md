# A Notion Loader

A Notion Loader 允许你从 Notion 载入数据，为你的 Astro 内容集合提供数据源。

## 安装

| package manager |           command            |
| :-------------: | :--------------------------: |
|       npm       |    npm i a-notion-loader     |
|      pnpm       |   pnpm add a-notion-loader   |
|       bun       |   bun add a-notion-loader    |
|      deno       | deno add npm:a-notion-loader |

## 配置

0. 根据 [Notion 集成指南][notion-integration-guide] 创建一个 Internal 集成
1. 在 **Configuration Tab** 中获取 **_Internal Integration Secret_**
2. 将 **_Internal Integration Secret_** 写入项目环境变量 `NOTION_KEY`
3. 在 **Capabilities** 中至少赋予集成 **_Read Content_** 能力
4. 在 **Access Tab** 中通过 **_Edit Access_** 选择可以访问的页面或数据库
5. 通过 [环境变量][astro-environment] `NOTION_KEY` 提供 `notionLoader` 的 `auth` 参数
6. 通过环境变量或其他方式为 `notionLoader` 提供 `pageId` 或 `databaseId`

## 使用方法

0. 参考 [Astro 内容集合指南][astro-content-collections] 初始化 `src/content.config.ts` 文件
1. 导入 `a-notion-loader`

   ```ts
   import { notionLoader } from 'a-notion-loader'
   import { defineCollection } from 'astro:content'

   const notionFromPage = defineCollection({
     loader: notionLoader({
       auth: import.meta.env.NOTION_KEY,
     }, {
       database_id: import.meta.env.DATABASE_ID,
     }, {
       Tags: 'multi_select',
     }),
   })

   export const collections = {
     notionFromPage,
   }
   ```

2. 运行 `astro sync` 或直接运行 `astro dev`
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
   {
     post.data.properties.Tags &&
       Object.values(post.data.properties.Tags.multi_select).map((tag) => <span class="tag">{tag.name}</span>)
   }
   ```

## 适配 Block

- [x] Paragraph
- [x] Divider
- [x] Code
- [x] Heading1\Heading2\Heading3
- [x] Table
- [x] Callout
- [x] Column_list
- [x] To_do
- [x] Quote
- [x] Toggle
- [x] Bulleted_list_item\Numbered_list_item
- [x] Image\Video\Audio\Pdf

## 已知问题

- 当使用 Toggleable Heading 时会[出现间距问题][summary-padding]

[notion-integration-guide]: https://developers.notion.com/docs/create-a-notion-integration#create-your-integration-in-notion
[astro-environment]: https://docs.astro.build/en/guides/environment-variables/#type-safe-environment-variables
[astro-content-collections]: https://docs.astro.build/en/guides/content-collections/#defining-collections
[summary-padding]: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/summary#summaries_as_headings
