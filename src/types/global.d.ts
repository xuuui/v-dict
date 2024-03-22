/*
 * @Date: 2024-03-22 14:55:02
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */

export {}

declare global {
  type Recordable<T = any> = Record<string, T>

  type Getter<T> = () => T

  type MaybeGetter<T> = T | Getter<T>

  type MaybePromise<T> = T | Promise<T>

  type UnwrapArray<T> = T extends (infer TItem)[] ? TItem : T

  type StringUnion<T> = T | (string & {})
}
