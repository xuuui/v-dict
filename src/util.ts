/*
 * @Date: 2023-12-18 10:24:32
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */

import type { DictItemRecord, DictMap } from './types'

export function isFunction(fn: unknown): fn is AnyFn {
  return typeof fn === 'function'
}

export function clearObj(obj: Recordable) {
  for (const key of Object.keys(obj)) {
    delete obj[key]
  }
}

export function mapToObj(map: DictMap, obj: Recordable<DictItemRecord> = {}) {
  clearObj(obj)
  for (const [key, value] of map) {
    obj[key] = value
  }
  return obj
}

function checkObjItem(item: DictItemRecord, key: string) {
  if (item.value === undefined) item.value = key
}

export function objToMap(obj: Recordable<DictItemRecord>): DictMap {
  const entries = Object.entries(obj)
  for (const [key, item] of entries) {
    checkObjItem(item, key)
  }
  return new Map(entries)
}

export function mapToList(map: DictMap, list: DictItemRecord[] = []): DictItemRecord[] {
  list.splice(0, list.length, ...map.values())
  return list
}

export function listToMap(list: DictItemRecord[]) {
  return new Map(list.map((item) => [item.value, item]))
}

type MapOptions = {
  pickValues?: string[]
  omitValues?: string[]
}

export function toMap(
  data: Recordable<DictItemRecord> | DictItemRecord[],
  options: MapOptions = {}
): DictMap {
  const { pickValues = [], omitValues = [] } = options

  const filterFn = (value: string): boolean =>
    (pickValues.length === 0 || pickValues.includes(value)) && !omitValues.includes(value)

  if (Array.isArray(data)) {
    return listToMap(data.filter((item) => filterFn(item.value)))
  }

  return new Map(
    Object.entries(data).filter(([key, item]) => {
      checkObjItem(item, key)
      return filterFn(key)
    })
  )
}

export const defineDictData = <T>(data: T): T => data
