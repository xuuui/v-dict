/*
 * @Date: 2023-12-18 10:24:32
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */

import { isArray, isUndefined, omit, pick } from 'lodash-es'

import type { DictItemRecord, DictMap } from './types'

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
  for (const key of Object.keys(obj)) {
    const item = obj[key]
    if (isUndefined(item.value)) {
      item.value = key
    }
    map.set(key, item)
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

export function toMap(
  data: Recordable<DictItemRecord> | DictItemRecord[],
  {
    pickValues,
    omitValues
  }: {
    pickValues?: string[]
    omitValues?: string[]
  } = {}
) {
  if (isArray(data)) {
    if (pickValues?.length) {
      data = data.filter((item) => pickValues.includes(item.value))
    }
    if (omitValues?.length) {
      data = data.filter((item) => !omitValues.includes(item.value))
    }
    return listToMap(data)
  }
  if (pickValues?.length) {
    data = pick(data, ...pickValues)
  }
  if (omitValues?.length) {
    data = omit(data, ...omitValues)
  }
  return objToMap(data)
}

export const defineDictData = <T>(data: T): T => data
