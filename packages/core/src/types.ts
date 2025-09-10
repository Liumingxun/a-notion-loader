import type { BlockObjectResponse, GetDataSourceResponse, PageObjectResponse, QueryDataSourceParameters, ToggleBlockObjectResponse } from '@notionhq/client/build/src/api-endpoints.d.ts'

type RecordValueOf<T> = T extends Record<string, infer U> ? U : never
type ValueOf<T> = T[keyof T]

export type PageProperties = PageObjectResponse['properties']
export type PagePropertyValue = ValueOf<PageProperties>
export type PageMetaType = Omit<PageObjectResponse, 'properties' | 'id' | 'object'> & { title: string }

type PropertyFilter = ([property_name, property]: [string, RecordValueOf<GetDataSourceResponse['properties']>]) => boolean
export type QueryEntriesFromDatabaseParams = Omit<QueryDataSourceParameters, 'filter_properties'> & { property_filter?: PropertyFilter }

export type BlockWithChildren = BlockObjectResponse & {
  children?: BlockWithChildren[]
}

export type ExtractBlock<T extends BlockWithChildren['type']> = Extract<BlockWithChildren, { type: T }>
