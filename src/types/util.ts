/*
 * @Date: 2024-03-22 11:22:45
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */

import type { Merge, Simplify } from 'type-fest'

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never

type LastOf<T extends object> = UnionToIntersection<
  T extends any ? () => T : never
> extends () => infer R
  ? R
  : never

type Push<T extends any[], V> = [...T, V]

type UnionToTuple<
  T extends object,
  L = LastOf<T>,
  N = [T] extends [never] ? true : false
> = true extends N ? [] : Push<UnionToTuple<Exclude<T, L>>, L>

type MissingProperties<T, U> = Exclude<keyof T, keyof U>

type CompareDataWithTarget<Data extends any[], Target> = {
  [K in keyof Data]: MissingProperties<Target, Data[K]>
}

type ExtractOptionalKey<T extends object> = CompareDataWithTarget<
  UnionToTuple<T>,
  UnionToIntersection<T>
>[number]

export type MergeUnionObject<T extends object> = Simplify<
  Merge<UnionToIntersection<T>, Partial<Pick<UnionToIntersection<T>, ExtractOptionalKey<T>>>>
>
