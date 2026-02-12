import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createPromise } from '../create-promise'
import type {
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
  const versionMap = Object.create(null) as Recordable<number>

  function clear(code?: string) {
    if (code) {
      maps[code]?.clear()
      return
    }
    Object.values(maps).forEach((map) => map.clear())
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
      // 初始化字典
      maps[code] = new Map()
      versionMap[code] = 0
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

    async function loadDict(options: Recordable, mapRef: React.MutableRefObject<DictMap>) {
      if (remote) {
        const res = (await fetch?.(extendCode ?? code, options)) ?? []

        toMap(res, { pickValues, omitValues, transformer, map: mapRef.current })
        toMap(cloneDeep(data as any), { pickValues, omitValues, transformer }).forEach(
          (value, key) => {
            if (mapRef.current.has(key)) {
              merge(mapRef.current.get(key)!, value)
            }
          }
        )
      } else {
        toMap(cloneDeep(data as any), { pickValues, omitValues, transformer, map: mapRef.current })
      }
      // 标记数据源变动
      versionMap[code] += 1
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
      const mapRef = useRef<DictMap>(!clone ? maps[code] : new Map())
      const versionRef = useRef(0)

      const getStateFromMapRef = () => {
        const newObj = Object.create(null) as Recordable<DictItemRecord>
        const newList: DictItemRecord[] = []

        mapToObj(mapRef.current, {
          obj: newObj,
          itemTransformer
        })

        mapToList(mapRef.current, {
          list: newList,
          itemTransformer
        })

        const newE = Object.fromEntries(
          Array.from(mapRef.current.keys()).map((key) => [key, transformer?.(key) ?? key])
        )

        return {
          map: newObj,
          list: newList,
          E: newE
        }
      }

      const [state, setState] = useState(getStateFromMapRef())

      if (versionRef.current !== versionMap[code]) {
        versionRef.current = versionMap[code]
        setState(getStateFromMapRef())
      }

      const load = useCallback((options?: Recordable) => {
        const oldLoadPromise = loadPromiseRef.current!
        loadPromiseRef.current = createPromise()

        loadDict({ ...mergedOptions, ...options }, mapRef).then(() => {
          setState(getStateFromMapRef())
          oldLoadPromise?.resolve(undefined)
          loadPromiseRef.current!.resolve(undefined)
        })

        return loadPromiseRef.current
      }, [])

      const clear = useCallback(() => {
        mapRef.current.clear()
        setState(getStateFromMapRef())
      }, [])

      const getItem = useCallback((value?: DictValue | null) => {
        return value !== null && value !== undefined ? mapRef.current.get(value) : null
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
      }, [state])

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
