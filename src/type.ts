/*
 * @Date: 2023-12-16 19:38:06
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */

import type { O } from 'ts-toolbelt'
import type { Simplify, ValueOf } from 'type-fest'

import type { createPromise } from './create-promise'

export type Recordable<T = any> = Record<string, T>

export type Getter<T> = () => T

export type MaybeGetter<T> = T | Getter<T>

export type UnwrapArray<T> = T extends (infer TItem)[] ? TItem : T

export type StringUnion<T> = T | (string & {})

export type DictItem = {
  label: string
  value: string
}

export type DictItemRecord = {
  label: string
  value: string
} & Recordable

export type DictMap = Map<string, DictItemRecord>

export type Fetch = (code: string, options?: any) => Promise<DictItemRecord[]>

export interface CreateDictManager<E extends ExtraGetter> {
  fetch?: Fetch
  extra?: E
}

export type ExtraGetter<D extends Dict<string> = Dict<string>> = (dict: D) => Recordable

export type UseDictOptions = {
  clone?: boolean
  immediate?: boolean
} & Recordable

type ExtractFetchOptions<F extends Fetch> = Parameters<F>[1] extends infer T
  ? T extends undefined
    ? {}
    : T
  : never

export interface DefineDict<Extra extends ExtraGetter> {
  <R extends boolean, F extends Fetch, D extends Recordable<Recordable>, E extends ExtraGetter>(
    code: string,
    options?: MaybeGetter<{
      remote?: R
      fetch?: F
      data?: D
      extra?: E
    }>
  ): (
    options?: Simplify<UseDictOptions & ExtractFetchOptions<F>>
  ) => Simplify<CreateDict<D, F> & ReturnType<Extra> & ReturnType<E>>
}

type CreateDict<D extends Recordable<Recordable>, F extends Fetch> = Dict<
  keyof D,
  O.Merge<UnwrapArray<Awaited<ReturnType<F>>>, ValueOf<D>>,
  UseDictOptions & ExtractFetchOptions<F>
>

export type LoadPromise = ReturnType<typeof createPromise<void>>

export type Dict<
  Key extends PropertyKey = PropertyKey,
  ExtraItem extends Recordable = Recordable,
  Options = Recordable
> = {
  list: Simplify<DictItem & ExtraItem>[]
  E: {
    [K in Key]: K
  }
  map: {
    [K in Key]: Simplify<DictItem & ExtraItem>
  } & Recordable<Simplify<DictItem & ExtraItem>>
  loadPromise: LoadPromise
  load: (options?: Options) => LoadPromise
}
