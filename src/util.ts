/*
 * @Date: 2023-12-18 10:24:32
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */
import { isArray, isUndefined } from 'lodash-es'
import type { WritableDeep } from 'type-fest'

import type { DictItemRecord, DictMap, Recordable } from './type'

const clearObj = (obj: Recordable) => {
  for (const key of Object.keys(obj)) {
    delete obj[key]
  }
}

export function mapToObj(map: DictMap, obj: Recordable<DictItemRecord> = {}) {
  clearObj(obj)
  map.forEach((value, key) => {
    obj[key] = value
  })
  return obj
}

export function objToMap(obj: Recordable<DictItemRecord>) {
  const map: DictMap = new Map()
  for (const [key, value] of Object.entries(obj)) {
    if (isUndefined(value.value)) {
      value.value = key
    }
    map.set(key, value)
  }
  return map
}

export function mapToList(map: DictMap, list: DictItemRecord[] = []) {
  list.length = 0
  list.push(...map.values())
  return list
}

export function listToMap(list: DictItemRecord[]) {
  const map: DictMap = new Map()
  for (const item of list) {
    map.set(item.value, item)
  }
  return map
}

export function toMap(data: Recordable<DictItemRecord> | DictItemRecord[]) {
  return isArray(data) ? listToMap(data) : objToMap(data)
}

const noop = () => {}

export type CreatePromiseReturn<T> = Promise<T> & {
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
}

export function createPromise<T = any>(
  executor?: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void
): CreatePromiseReturn<T> {
  let resolve: CreatePromiseReturn<T>['resolve'] = noop
  let reject: CreatePromiseReturn<T>['reject'] = noop

  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
    executor?.(_resolve, _reject)
  }) as CreatePromiseReturn<T>

  promise.resolve = resolve
  promise.reject = reject

  return promise
}

export const defineDictData = <
  const T extends { label: string } & Recordable,
  const K extends string
>(
  data: Record<K, T>
): Record<K, WritableDeep<T>> => data as any
