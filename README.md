# Astro Notion Loader

Astro Notion Loader 允许你从 Notion 载入数据，为你的 Astro Content Collections 提供数据源。

## 安装

| package manager |             command              |
| :-------------: | :------------------------------: |
|       npm       |    npm i astro-notion-loader     |
|      pnpm       |   pnpm add astro-notion-loader   |
|       bun       |   bun add astro-notion-loader    |
|      deno       | deno add npm:astro-notion-loader |

## 使用方法

0. 参考 [内容集合指南](https://docs.astro.build/zh-cn/guides/content-collections/#%E5%AE%9A%E4%B9%89%E9%9B%86%E5%90%88) 初始化 `src/content.config.ts` 文件
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

在项目根目录下创建 `.env` 文件：

```
NOTION_TOKEN=你的Notion集成Token
DATABASE_ID=你的数据库ID
```

## 贡献

欢迎提交 issue 或 pull request 改进本项目！

## 许可证

MIT License
