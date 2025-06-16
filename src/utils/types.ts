import type { BlockObjectResponse, BulletedListItemBlockObjectResponse, NumberedListItemBlockObjectResponse, PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.d.ts'

export type RecordValueOf<T> = T extends Record<string, infer U> ? U : never
type ValueOf<T> = T[keyof T]
type OmitId<T> = T extends any ? Omit<T, 'id'> : never

type PageProperties = PageObjectResponse['properties']
type PagePropertyValue = ValueOf<PageProperties>
type PagePropertyValueWithoutId = OmitId<PagePropertyValue>
export type PagePropertiesType<T extends PagePropertyValueWithoutId = PagePropertyValueWithoutId> = Array<{ label: string, value: T }>
export type PageMetaType = Omit<PageObjectResponse, 'properties' | 'id' | 'object'> & { title: string }

export function isListItemBlock(block: BlockObjectResponse): block is BulletedListItemBlockObjectResponse | NumberedListItemBlockObjectResponse {
  return block.type === 'bulleted_list_item' || block.type === 'numbered_list_item'
}
