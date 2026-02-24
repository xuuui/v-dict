/*
 * @Date: 2023-12-18 10:24:32
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */

import type {
  AnyFn,
  DictItemRecord,
  DictMap,
  DictValue,
  Merge,
  PlainObject,
  Recordable
} from './types'

export const warn = (msg: string) => console.warn(`[v-dict]: ${msg}`)

export function isFunction(fn: unknown): fn is AnyFn {
  return typeof fn === 'function'
}

export function clearObj(obj: Recordable) {
  for (const key of Object.keys(obj)) {
    delete obj[key]
  }
}

export function mapToObj(
  map: DictMap,
  {
    obj = {},
    itemTransformer
  }: {
    obj?: Recordable<DictItemRecord>
    itemTransformer?: (item: DictItemRecord) => any
  } = {}
) {
  clearObj(obj)
  for (const [key, value] of map) {
    obj[key] = isFunction(itemTransformer) ? itemTransformer(value) : value
  }
  return obj
}

function checkObjItem(
  item: DictItemRecord,
  key: string,
  transformer?: (value: DictValue) => DictValue
) {
  if (item.value === undefined) {
    item.value = key
  }
  if (isFunction(transformer)) {
    item.value = transformer(item.value)
  }
}

export function mapToList(
  map: DictMap,
  {
    list = [],
    itemTransformer
  }: {
    list?: DictItemRecord[]
    itemTransformer?: (item: DictItemRecord) => any
  } = {}
): DictItemRecord[] {
  const values = isFunction(itemTransformer) ? map.values().map(itemTransformer) : map.values()
  list.splice(0, list.length, ...values)
  return list
}

type MapOptions = {
  map?: DictMap
  pickValues?: DictValue[]
  omitValues?: DictValue[]
  transformer?: (value: DictValue) => DictValue
}

export function toMap(
  data: Recordable<DictItemRecord> | DictItemRecord[],
  { map = new Map(), pickValues = [], omitValues = [], transformer }: MapOptions = {}
): DictMap {
  const filterFn = (value: DictValue): boolean =>
    (pickValues.length === 0 || pickValues.includes(value)) && !omitValues.includes(value)

  map.clear()
  Object.entries(data)
    .filter(([key, item]) => {
      checkObjItem(item, key, transformer)
      return filterFn(item.value)
    })
    .forEach(([, item]) => map.set(item.value, item))

  return map
}

export const defineDictData = <T>(data: T): T => data

const { toString } = Object.prototype

export function isPlainObject(obj: any): obj is PlainObject {
  return toString.call(obj) === '[object Object]'
}

export function merge<T extends PlainObject, S extends PlainObject[]>(
  target: T,
  ...sources: S
): Merge<[T, ...S]> {
  if (!sources.length) return target as unknown as Merge<[T, ...S]>
  const source = sources.shift()
  if (source && isPlainObject(source)) {
    for (const key of Reflect.ownKeys(source)) {
      const value = source[key]
      if (isPlainObject(value)) {
        if (!isPlainObject(target[key])) {
          // @ts-expect-error
          target[key] = {}
        }
        merge(target[key], value)
      } else {
        // @ts-expect-error
        target[key] = value
      }
    }
  }
  return merge(target, ...sources)
}

export function cloneDeep<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(cloneDeep) as T
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as T
  }

  if (value instanceof Map) {
    const copy = new Map()
    value.forEach((val, key) => {
      copy.set(cloneDeep(key), cloneDeep(val))
    })
    return copy as T
  }

  if (value instanceof Set) {
    const copy = new Set()
    value.forEach((val) => {
      copy.add(cloneDeep(val))
    })
    return copy as T
  }

  if (isPlainObject(value)) {
    const copy: PlainObject = {}
    for (const key of Reflect.ownKeys(value)) {
      // @ts-expect-error
      copy[key] = cloneDeep(value[key])
    }
    return copy as T
  }

  return value
}
