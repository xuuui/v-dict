/*
 * @Date: 2023-12-16 19:38:06
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */

import type { O } from 'ts-toolbelt'
import type { Except, Simplify, ValueOf } from 'type-fest'

import type { createPromise } from './util'

export type Recordable<T = any> = Record<string, T>

export type Getter<T> = () => T

export type MaybeGetter<T> = T | Getter<T>

export type UnwrapArray<T> = T extends (infer TItem)[] ? TItem : T

export type StringUnion<T> = T | (string & {})

export type DictItem = {
  label: string
  value: string
}

export type DictItemRecord = Simplify<DictItem & Recordable>

export type DictMap = Map<string, DictItemRecord>

export type Fetch = (code: string, ctx: any) => Promise<DictItemRecord[]>

export interface CreateDictManager<E extends ExtraGetter> {
  fetch?: Fetch
  extra?: E
}

export type ExtraGetter<D extends Dict<string> = Dict<string>> = (
  dict: Except<D, 'load'>
) => Recordable

export type UseDictOptions = {
  clone?: boolean
  immediate?: boolean
} & Recordable

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
    options?: UseDictOptions & GetFetchCtx<F>
  ) => CreateDict<D, F> & ReturnType<Extra> & ReturnType<E>
}

type GetFetchCtx<F extends Fetch> = Parameters<F>[1] extends undefined ? {} : Parameters<F>[1]

type CreateDict<D extends Recordable<Recordable>, F extends Fetch> = Dict<
  keyof D,
  O.Merge<UnwrapArray<Awaited<ReturnType<F>>>, ValueOf<D>>,
  UseDictOptions & GetFetchCtx<F>
>

export type Dict<
  Key extends PropertyKey = PropertyKey,
  ExtraItem extends Recordable = Recordable,
  Ctx = any
> = {
  list: Simplify<DictItem & ExtraItem>[]
  E: {
    [K in Key]: K
  }
  map: {
    [K in Key]: Simplify<DictItem & ExtraItem>
  } & Recordable<Simplify<DictItem & ExtraItem>>
  loadPromise: Promise<void>
  load: (ctx: Ctx) => Promise<void>
}

export type LoadPromise = ReturnType<typeof createPromise<void>> | undefined
