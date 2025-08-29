import type { BlockObjectResponse, GetDatabaseResponse, PageObjectResponse, QueryDatabaseParameters, ToggleBlockObjectResponse } from '@notionhq/client/build/src/api-endpoints.d.ts'

type RecordValueOf<T> = T extends Record<string, infer U> ? U : never
type ValueOf<T> = T[keyof T]

export type PageProperties = PageObjectResponse['properties']
export type PagePropertyValue = ValueOf<PageProperties>
export type PageMetaType = Omit<PageObjectResponse, 'properties' | 'id' | 'object'> & { title: string }

export function isToggleBlock(block: BlockObjectResponse): block is ToggleBlockObjectResponse {
  return block.type === 'toggle'
}

type PropertyFilter = ([property_name, property]: [string, RecordValueOf<GetDatabaseResponse['properties']>]) => boolean
export type QueryEntriesFromDatabaseParams = Omit<QueryDatabaseParameters, 'filter_properties'> & { property_filter?: PropertyFilter }
