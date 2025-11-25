/*
 * @Date: 2025-02-17 04:59:34
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */
// ========== 用于元组类型的 Merge 实现 ==========
type TupleUnionKeys<T> = T extends any ? keyof T : never
type TupleAllKeys<T extends any[]> = TupleUnionKeys<T[number]>

type TupleGetUnionType<T extends any[], K extends PropertyKey> = T extends [
  infer First,
  ...infer Rest
]
  ? (K extends keyof First ? First[K] : undefined) | TupleGetUnionType<Rest, K>
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

type TupleRequiredKeys<T extends any[]> = {
  [K in TupleAllKeys<T>]: IsAllRequired<T, K> extends true ? K : never
}[TupleAllKeys<T>]

export type Merge<T extends any[]> = {
  [K in Exclude<TupleAllKeys<T>, TupleRequiredKeys<T>>]?: Widen<TupleGetUnionType<T, K>>
} & {
  [K in TupleRequiredKeys<T>]: Widen<TupleGetUnionType<T, K>>
} extends infer O
  ? { [P in keyof O]: O[P] }
  : never

// ========== 用于联合类型的 MergeUnion 实现 ==========
type UnionKeys<T> = T extends any ? keyof T : never

type UnionValueOf<T, K extends PropertyKey> = T extends any
  ? K extends keyof T
    ? T[K]
    : undefined
  : never

type UnionIsAlwaysPresent<T, K extends PropertyKey> = [T] extends [infer U]
  ? U extends any
    ? K extends keyof U
      ? true
      : false
    : never
  : never

type UnionRequiredKeys<T> = {
  [K in UnionKeys<T>]: UnionIsAlwaysPresent<T, K> extends true ? K : never
}[UnionKeys<T>]

type UnionOptionalKeys<T> = Exclude<UnionKeys<T>, UnionRequiredKeys<T>>

export type MergeUnion<T> = {
  [K in UnionOptionalKeys<T>]?: Widen<UnionValueOf<T, K>>
} & {
  [K in UnionRequiredKeys<T>]: Widen<UnionValueOf<T, K>>
} extends infer O
  ? { [P in keyof O]: O[P] }
  : never

// ========== MergeValues 实现 ==========
export type MergeValues<T> = MergeUnion<
  {
    [K in keyof T]: T[K]
  }[keyof T]
>
