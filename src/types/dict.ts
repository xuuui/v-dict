/*
 * @Date: 2024-03-22 14:56:19
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */

import type { createPromise } from '../create-promise'
import type { Merge, MergeValues } from './merge'

export type DictItem = {
  label: string
  value: string
}

export type DictItemRecord = DictItem & Recordable

export type DictMap = Map<string, DictItemRecord>

export type LoadPromise = ReturnType<typeof createPromise<void>>

export type Dict<
  K extends PropertyKey = PropertyKey,
  I extends Recordable = DictItem,
  O extends Recordable = Recordable
> = {
  list: I[]
  E: {
    [X in K]: X
  }
  map: {
    [X in K]: I
  }
  loadPromise: LoadPromise
  load: (options?: O) => LoadPromise
  clear: () => void
  getItem: (value?: I['value'] | Nil) => I | Nil
}

export type Fetch = (code: string, options?: Recordable) => MaybePromise<DictItemRecord[]>

type FetchOptions<F extends Fetch> = Parameters<F>[1] extends infer T
  ? T extends Nil
    ? {}
    : T
  : {}

type FetchReturnItem<F extends Fetch> = UnwrapArray<Awaited<ReturnType<F>>> extends infer Item
  ? If<never, Item, {}>
  : {}

export type ExtraGetter<D extends Dict<string> = Dict<string>> = (dict: D) => Recordable

export interface CreateDictManagerOptions<E extends ExtraGetter, F extends Fetch> {
  fetch?: F
  extra?: E
}

export type UseDictOptions = {
  clone?: boolean
  immediate?: boolean
  refresh?: boolean
} & Recordable

type Options<F extends Fetch> = FetchOptions<F> & {
  dictOptions?: UseDictOptions
}

type CreateDict<D extends Recordable<Recordable>, F extends Fetch> = Dict<
  keyof D,
  Simplify<
    Merge<[DictItem, FetchReturnItem<F>, MergeValues<D>]> extends infer Item
      ? Item extends never
        ? DictItem
        : Item extends Recordable
        ? OptionalRequired<Item, 'label' | 'value'>
        : DictItem
      : DictItem
  >,
  Simplify<Options<F>>
>

type _UseDict<E extends Recordable, D extends Recordable<Recordable>, F extends Fetch> = (
  options?: Simplify<Options<F>>
) => CreateDict<D, F> & E

export type UseDict<
  E extends Recordable,
  D extends Recordable<Recordable>,
  F extends Fetch
> = _UseDict<E, D, F> & {
  extend: (
    extendCode: string,
    extendOptions?: {
      pickValues?: Simplify<keyof D>[]
      omitValues?: Simplify<keyof D>[]
    }
  ) => UseDict<E, D, F>
}

type Data<R extends boolean> = Recordable<
  (R extends true ? { label?: string } : { label: string }) & Recordable
>

export interface DefineDict<ME extends ExtraGetter, MF extends Fetch> {
  <R extends boolean, F extends Fetch, D extends Data<R>, E extends ExtraGetter>(
    code: string,
    options?: MaybeGetter<{
      remote?: R
      fetch?: F
      data?: D
      extra?: E
    }>
  ): UseDict<ReturnType<ME> & ReturnType<E>, D, MF>
}

export type VDictItem<T extends AnyFn> = ReturnType<T> extends {
  list: Array<infer R>
}
  ? R
  : never

export type VDictUnionValue<T extends AnyFn> = ReturnType<T> extends {
  E: infer R
}
  ? keyof R
  : never
