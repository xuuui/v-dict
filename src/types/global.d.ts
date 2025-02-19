/*
 * @Date: 2024-03-22 14:55:02
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */

export {}

declare global {
  type Nil = undefined | null

  type PlainObject<T = any> = Record<PropertyKey, any>

  type Recordable<T = any> = Record<string, T>

  type AnyFn<Return = any, Args extends unknown[] = any[]> = (...args: Args) => Return

  type Getter<T> = () => T

  type MaybeGetter<T> = T | Getter<T>

  type MaybePromise<T> = T | Promise<T>

  type UnwrapArray<T> = T extends (infer TItem)[] ? TItem : T

  type StringUnion<T> = T | (string & {})

  type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {}

  type OptionalRequired<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>

  type If<C, A, B> = A extends C ? B : A
}
