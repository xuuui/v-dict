/*
 * @Date: 2025-02-17 04:59:34
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */
type UnionKeys<T> = T extends any ? keyof T : never
type AllKeys<T extends any[]> = UnionKeys<T[number]>

type GetUnionType<T extends any[], K extends PropertyKey> = T extends [infer First, ...infer Rest]
  ? (K extends keyof First ? First[K] : never) | GetUnionType<Rest, K>
  : never

type Widen<T> = T extends string
  ? string
  : T extends number
  ? number
  : T extends boolean
  ? boolean
  : T

type IsRequiredProperty<T, K extends keyof T> = {} extends Pick<T, K> ? false : true
type IsAllRequired<T extends any[], K> = T extends [infer First, ...infer Rest]
  ? (K extends keyof First ? IsRequiredProperty<First, K> : false) extends true
    ? IsAllRequired<Rest, K>
    : false
  : true

type RequiredKeys<T extends any[]> = {
  [K in AllKeys<T>]: IsAllRequired<T, K> extends true ? K : never
}[AllKeys<T>]

export type Merge<T extends any[]> = {
  [K in Exclude<AllKeys<T>, RequiredKeys<T>>]?: Widen<GetUnionType<T, K>>
} & {
  [K in RequiredKeys<T>]: Widen<GetUnionType<T, K>>
} extends infer O
  ? { [P in keyof O]: O[P] }
  : never

export type MergeUnion<T> = Merge<[T]>

export type MergeValues<T> = MergeUnion<
  {
    [K in keyof T]: T[K]
  }[keyof T]
>
