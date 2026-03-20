import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

import { createPromise } from '../create-promise'
import type {
  AnyFn,
  CreateDictManagerOptions,
  DefineDict,
  DictItemRecord,
  DictMap,
  DictValue,
  ExtraGetter,
  Fetch,
  LoadPromise,
  Recordable,
  UseDictOptions
} from '../types'
import { cloneDeep, isFunction, mapToList, mapToObj, merge, toMap, warn } from '../util'

export function createDictManager<E extends ExtraGetter, F extends Fetch>(
  createDictManagerOptions: CreateDictManagerOptions<E, F> = {}
) {
  const {
    fetch: managerFetch,
    extra: managerExtra,
    transformer: managerTransformer,
    itemTransformer: managerItemTransformer
  } = createDictManagerOptions

  const defineDictOptionsMap = new Map<string, Recordable>()

  const maps = Object.create(null) as Recordable<DictMap>
  const listenersMap = Object.create(null) as Recordable<Set<AnyFn>>

  function emitChange(code?: string) {
    const listeners = code
      ? (listenersMap[code] ?? new Set())
      : Object.values(listenersMap).reduce((acc, set) => {
          set.forEach((listener) => acc.add(listener))
          return acc
        }, new Set<AnyFn>())
    listeners.forEach((listener) => listener())
  }

  function clear(code?: string) {
    if (code) {
      maps[code]?.clear()
    } else {
      Object.values(maps).forEach((map) => map?.clear())
    }
    emitChange(code)
  }

  type DefineDictOptions = Parameters<DefineDict<E, F>>[1]

  function _defineDict(
    defineDictInternalOptions: {
      pickValues?: DictValue[]
      omitValues?: DictValue[]
      extendCode?: string
    },
    code: string,
    defineDictOptions: DefineDictOptions
  ) {
    const { pickValues, omitValues, extendCode } = defineDictInternalOptions

    if (maps[code]) {
      warn(`code "${code}" already exists`)
    } else {
      maps[code] = new Map()
    }

    const _defineDictOptions: DefineDictOptions = Object.assign(
      {
        data: {},
        remote: false,
        fetch: managerFetch,
        transformer: managerTransformer,
        itemTransformer: managerItemTransformer
      },
      isFunction(defineDictOptions) ? defineDictOptions() : defineDictOptions
    )
    defineDictOptionsMap.set(code, cloneDeep(_defineDictOptions))

    const { data, remote, fetch, extra, transformer, itemTransformer } = _defineDictOptions

    let globalLoadPromise: LoadPromise = createPromise()
    let init = false

    async function loadDict(options: Recordable, map: DictMap = new Map()) {
      if (remote) {
        const res = (await fetch?.(extendCode ?? code, options)) ?? []

        toMap(res, { pickValues, omitValues, transformer, map })
        toMap(cloneDeep(data as any), { pickValues, omitValues, transformer }).forEach(
          (value, key) => {
            if (map.has(key)) {
              merge(map.get(key)!, value)
            }
          }
        )
      } else {
        toMap(cloneDeep(data as any), { pickValues, omitValues, transformer, map })
      }
      return map
    }

    function subscribeMap(listener: AnyFn) {
      listenersMap[code] ??= new Set()
      listenersMap[code].add(listener)
      return () => {
        listenersMap[code].delete(listener)
      }
    }

    function getMapSnapshot() {
      return maps[code]
    }

    function useDict(useDictOptions: UseDictOptions = {}) {
      const mergedOptions = {
        clone: false,
        immediate: true,
        refresh: false,
        ...useDictOptions
      }
      const { clone, immediate, refresh } = mergedOptions

      const globalMap = useSyncExternalStore(subscribeMap, getMapSnapshot)
      const [clonedMap, setClonedMap] = useState(new Map())

      const createStateFromMap = (map: DictMap = new Map()) => {
        const newObj = Object.create(null) as Recordable<DictItemRecord>
        const newList: DictItemRecord[] = []

        mapToObj(map, {
          obj: newObj,
          itemTransformer
        })

        mapToList(map, {
          list: newList,
          itemTransformer
        })

        const newE = Object.fromEntries(
          Array.from(map.keys()).map((key) => [key, transformer?.(key) ?? key])
        )

        const getItem = (value?: DictValue | null) => {
          return value !== null && value !== undefined ? newObj[value] : null
        }

        return {
          map: newObj,
          list: newList,
          E: newE,
          getItem
        }
      }

      const stateRef = useRef({
        ...createStateFromMap(clonedMap),
        clear: () => {
          if (!clone) {
            maps[code] = new Map()
            emitChange(code)
            return
          }
          setClonedMap(new Map())
        },
        loadPromise: !clone ? globalLoadPromise : createPromise(),
        async load(options?: Recordable) {
          const oldLoadPromise = stateRef.current.loadPromise
          stateRef.current.loadPromise = createPromise()
          if (!clone) {
            globalLoadPromise = stateRef.current.loadPromise
          }

          loadDict({ ...mergedOptions, ...options }).then((map) => {
            Object.assign(stateRef.current, createStateFromMap(map))

            if (!clone) {
              maps[code] = map
              emitChange(code)
            } else {
              setClonedMap(map)
            }

            oldLoadPromise?.resolve(undefined)
            stateRef.current.loadPromise.resolve(undefined)
          })

          return stateRef.current.loadPromise
        }
      })

      if (!clone) {
        Object.assign(stateRef.current, createStateFromMap(globalMap))
      }

      useEffect(() => {
        if (remote && !immediate) {
          return
        }
        if (clone) {
          stateRef.current.load()
        } else {
          if (!init) {
            init = true
            stateRef.current.load()
          } else if (refresh) {
            stateRef.current.load()
          }
        }
      }, [])

      const ctx = useMemo(() => {
        return {
          ...stateRef.current,
          // @ts-ignore
          ...managerExtra?.(stateRef.current),
          // @ts-ignore
          ...extra?.(stateRef.current),
          ref: stateRef
        }
      }, [!clone ? globalMap : clonedMap])

      return ctx
    }

    useDict.extend = (
      extendCode: string,
      extendOptions?: {
        pickValues?: DictValue[]
        omitValues?: DictValue[]
      }
    ) => {
      const { pickValues, omitValues } = extendOptions ?? {}
      const options = defineDictOptionsMap.get(code)
      return _defineDict({ pickValues, omitValues, extendCode: code }, extendCode, options)
    }

    return useDict
  }

  const defineDict = _defineDict.bind(null, {}) as unknown as DefineDict<E, F>

  return { defineDict, clear, maps }
}
