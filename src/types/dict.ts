/*
 * @Date: 2024-03-22 14:56:19
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */

import type { Merge, Simplify, ValueOf } from 'type-fest'

import type { createPromise } from '../create-promise'
import type { MergeUnionObject } from './util'

export type DictItem = {
  label: string
  value: string
}

export type DictItemRecord = {
  label: string
  value: string
  [x: string]: any
}

export type DictMap = Map<string, DictItemRecord>

export type Fetch = (code: string, options?: any) => MaybePromise<DictItemRecord[]>

export interface CreateDictManager<E extends ExtraGetter> {
  fetch?: Fetch
  extra?: E
}

export type ExtraGetter<D extends Dict<string> = Dict<string>> = (dict: D) => Recordable

export type UseDictOptions = {
  clone?: boolean
  immediate?: boolean
  refresh?: boolean
  [x: string]: any
}

type ExtractFetchOptions<F extends Fetch> = Parameters<F>[1] extends infer T
  ? T extends undefined
    ? {}
    : T
  : never

type ExtractFetchReturn<F extends Fetch> = UnwrapArray<Awaited<ReturnType<F>>> extends infer Item
  ? Item extends never
    ? {}
    : Item
  : never

type _UseDict<
  ME extends ExtraGetter,
  E extends ExtraGetter,
  D extends Recordable,
  F extends Fetch
> = (
  options?: Simplify<UseDictOptions & ExtractFetchOptions<F>>
) => Simplify<CreateDict<D, F> & ReturnType<ME> & ReturnType<E>>

type UseDict<
  ME extends ExtraGetter,
  E extends ExtraGetter,
  D extends Recordable,
  F extends Fetch
> = _UseDict<ME, E, D, F> & {
  extend: (
    extendCode: string,
    extendOptions?: {
      pickValues?: Simplify<keyof D>[]
      omitValues?: Simplify<keyof D>[]
    }
  ) => UseDict<ME, E, D, F>
}

export interface DefineDict<ME extends ExtraGetter> {
  <
    R extends boolean,
    F extends Fetch,
    D extends Recordable<{ label: string; [x: string]: any }>,
    E extends ExtraGetter
  >(
    code: string,
    options?: MaybeGetter<{
      remote?: R
      fetch?: F
      data?: D
      extra?: E
    }>
  ): UseDict<ME, E, D, F>
}

type CreateDict<D extends Recordable<Recordable>, F extends Fetch> = Dict<
  keyof D,
  Merge<ExtractFetchReturn<F>, MergeUnionObject<ValueOf<D>>>,
  UseDictOptions & ExtractFetchOptions<F>
>

export type LoadPromise = ReturnType<typeof createPromise<void>>

export type Dict<
  Key extends PropertyKey = PropertyKey,
  Item extends Recordable = DictItem,
  Options = Recordable
> = {
  list: Simplify<{ value: string } & Item>[]
  E: {
    [K in Key]: K
  }
  map: {
    [K in Key]: Simplify<{ value: string } & Item>
  }
  loadPromise: LoadPromise
  load: (options?: Options) => LoadPromise
  clear: () => void
  getItem: (value?: string | null) => Simplify<{ value: string } & Item> | null
}
