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
  const listenersMap = Object.create(null) as Recordable<AnyFn[]>

  function emitChange(code?: string) {
    const listeners = code ? listenersMap[code] ?? [] : Object.values(listenersMap).flat()
    for (let listener of listeners) {
      listener()
    }
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

    let globalLoadPromise: LoadPromise | null = null
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
      listenersMap[code] = [...(listenersMap[code] ?? []), listener]
      return () => {
        listenersMap[code] = listenersMap[code].filter((l) => l !== listener)
      }
    }

    function getMapSnapshot() {
      return maps[code]
    }

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

      return {
        map: newObj,
        list: newList,
        E: newE
      }
    }

    function useDict(useDictOptions: UseDictOptions = {}) {
      const mergedOptions = {
        clone: false,
        immediate: true,
        refresh: false,
        ...useDictOptions
      }
      const { clone, immediate, refresh } = mergedOptions

      const loadPromiseRef = useRef<LoadPromise | null>(
        !clone ? globalLoadPromise : createPromise()
      )

      const map = useSyncExternalStore(subscribeMap, getMapSnapshot)
      const [clonedMap, setClonedMap] = useState(new Map())

      const state = useMemo(
        () => createStateFromMap(!clone ? map : clonedMap),
        [clone, map, clonedMap]
      )

      const load = useCallback((options?: Recordable) => {
        const oldLoadPromise = loadPromiseRef.current
        loadPromiseRef.current = createPromise()

        loadDict({ ...mergedOptions, ...options }).then((map) => {
          if (!clone) {
            maps[code] = map
            emitChange(code)
          } else {
            setClonedMap(map)
          }
          oldLoadPromise?.resolve(undefined)
          loadPromiseRef.current!.resolve(undefined)
        })

        return loadPromiseRef.current
      }, [])

      const clear = useCallback(() => {
        if (!clone) {
          maps[code] = new Map()
          emitChange(code)
          return
        }
        setClonedMap(map)
      }, [])

      const getItem = useCallback((value?: DictValue | null) => {
        return value !== null && value !== undefined ? state.map[value] : null
      }, [])

      useEffect(() => {
        if (!remote || immediate) {
          if (clone) {
            load()
          } else {
            if (!globalLoadPromise) {
              globalLoadPromise = createPromise()
              load()
            } else {
              globalLoadPromise.then(() => {
                if (!init) {
                  init = true
                  load()
                } else if (refresh) {
                  load()
                }
              })
            }
          }
        } else {
          if (!globalLoadPromise) {
            globalLoadPromise = createPromise()
            globalLoadPromise.resolve(undefined)
          }
        }
      }, [])

      const ctx = useMemo(() => {
        const _ctx = {
          map: state.map,
          list: state.list,
          E: state.E,
          loadPromise: loadPromiseRef.current,
          load,
          getItem,
          clear
        }
        return {
          ..._ctx,
          // @ts-ignore
          ...managerExtra?.(_ctx),
          // @ts-ignore
          ...extra?.(_ctx)
        }
      }, [state, loadPromiseRef.current])

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
