import type { ListBlockChildrenResponse, PageObjectResponse, ParagraphBlockObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { isFullBlock } from '@notionhq/client'
import { expect, it } from 'vitest'
import { reduceParagraph } from '../utils'
import content from './pageContent.json'

const paragraphBlock = {
  object: 'block',
  id: '155e149e-1db1-80ae-aff9-c0b4b699ce19',
  parent: {
    type: 'page_id',
    page_id: '155e149e-1db1-80fa-a626-cc4be4bd54de',
  },
  created_time: '2024-12-07T10:48:00.000Z',
  last_edited_time: '2024-12-07T10:48:00.000Z',
  created_by: {
    object: 'user',
    id: '83df5c26-6c96-4556-9fdc-55e12ef118d6',
  },
  last_edited_by: {
    object: 'user',
    id: '83df5c26-6c96-4556-9fdc-55e12ef118d6',
  },
  has_children: false,
  archived: false,
  in_trash: false,
  type: 'paragraph',
}

const noTagParagraph = {
  ...paragraphBlock,
  paragraph: {
    rich_text: [
      {
        type: 'text',
        text: {
          content: 'well',
          link: null,
        },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        plain_text: 'well',
        href: null,
      },
    ],
    color: 'default',
  },
} as ParagraphBlockObjectResponse

it(
  'no tag',
  () => expect(reduceParagraph(noTagParagraph)).toMatchInlineSnapshot(`"well"`),
)

const italicParagraph = {
  ...paragraphBlock,
  paragraph: {
    rich_text: [
      {
        type: 'text',
        text: { content: 'italic', link: null },
        annotations: {
          bold: false,
          italic: true,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        plain_text: 'italic',
        href: null,
      },
    ],
    color: 'default',
  },
} as ParagraphBlockObjectResponse

it(
  'italic tag',
  () => expect(reduceParagraph(italicParagraph)).toMatchInlineSnapshot(`"<em>italic</em>"`),
)

const mixedAnnotationsParagraph = {
  ...paragraphBlock,
  paragraph: {
    rich_text: [
      {
        type: 'text',
        text: { content: 'bold and italic', link: null },
        annotations: {
          bold: true,
          italic: true,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        plain_text: 'bold and italic',
        href: null,
      },
    ],
    color: 'default',
  },
} as ParagraphBlockObjectResponse

it(
  'bold and italic tags',
  () => expect(reduceParagraph(mixedAnnotationsParagraph)).toMatchInlineSnapshot(`"<em><strong>bold and italic</strong></em>"`),
)

const linkParagraph = {
  ...paragraphBlock,
  paragraph: {
    rich_text: [
      {
        type: 'text',
        text: { content: 'link', link: { url: 'https://example.com' } },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        plain_text: 'link',
        href: 'https://example.com',
      },
    ],
    color: 'default',
  },
} as ParagraphBlockObjectResponse

it(
  'link tag',
  () => expect(reduceParagraph(linkParagraph)).toMatchInlineSnapshot(`"<a href="https://example.com">link</a>"`),
)

const coloredParagraph = {
  ...paragraphBlock,
  paragraph: {
    rich_text: [
      {
        type: 'text',
        text: { content: 'colored text', link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'red',
        },
        plain_text: 'colored text',
        href: null,
      },
    ],
    color: 'default',
  },
} as ParagraphBlockObjectResponse

it(
  'colored text',
  () => expect(reduceParagraph(coloredParagraph)).toMatchInlineSnapshot(`"<mark color="red">colored text</mark>"`),
)

const complexParagraph = {
  ...paragraphBlock,
  paragraph: {
    rich_text: [
      {
        type: 'text',
        text: { content: 'complex', link: { url: 'https://example.com' } },
        annotations: {
          bold: true,
          italic: true,
          strikethrough: true,
          underline: true,
          code: true,
          color: 'blue',
        },
        plain_text: 'complex',
        href: 'https://example.com',
      },
    ],
    color: 'default',
  },
} as ParagraphBlockObjectResponse

it(
  'complex annotations',
  () =>
    expect(reduceParagraph(complexParagraph)).toMatchInlineSnapshot(
      `"<code><u><s><em><strong><mark color="blue"><a href="https://example.com">complex</a></mark></strong></em></s></u></code>"`,
    ),
)

;(content as ListBlockChildrenResponse).results.filter(r => isFullBlock(r) && r.type === 'paragraph').map(p => it(`paragraph`, () => {
  return expect(reduceParagraph(p)).toMatchSnapshot()
}))
