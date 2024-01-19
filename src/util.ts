/*
 * @Date: 2023-12-18 10:24:32
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */
import { isArray, isUndefined } from 'lodash-es'
import type { WritableDeep } from 'type-fest'

import type { DictItemRecord, DictMap, Recordable } from './type'

export function clearObj(obj: Recordable) {
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

export const defineDictData = <
  const T extends { label: string } & Recordable,
  const K extends string
>(
  data: Record<K, T>
): Record<K, WritableDeep<T>> => data as any
