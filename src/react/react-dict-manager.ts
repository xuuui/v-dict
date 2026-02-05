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
import { clearObj, cloneDeep, isFunction, mapToList, mapToObj, merge, toMap } from '../util'

const warn = (msg: string) => console.warn(`[v-dict/react]: ${msg}`)

export function createDictManager<E extends ExtraGetter, F extends Fetch>(
  createDictManagerOptions: CreateDictManagerOptions<E, F> = {}
) {
  const {
    fetch: managerFetch,
    extra: managerExtra,
    transformer: managerTransformer,
    itemTransformer: managerItemTransformer
  } = createDictManagerOptions

  const maps = Object.create(null) as Recordable<DictMap>
  const defineDictOptionsMap = new Map<string, Recordable>()

  function clear(code?: string) {
    if (code) {
      maps[code]?.clear()
      return
    }
    clearObj(maps)
  }

  type DefineDictInternalOptions = {
    pickValues?: DictValue[]
    omitValues?: DictValue[]
    extendCode?: string
  }
  type DefineDictOptions = Parameters<DefineDict<E, F>>[1]

  function _defineDict(
    defineDictInternalOptions: DefineDictInternalOptions,
    code: string,
    defineDictOptions: DefineDictOptions
  ) {
    const { pickValues, omitValues, extendCode } = defineDictInternalOptions

    if (maps[code]) {
      warn(`code "${code}" already exists`)
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
    let loaded = false
    maps[code] = new Map()

    async function loadDict(
      options: Recordable,
      mapRef: React.MutableRefObject<DictMap | undefined>
    ) {
      const dataMap = toMap(cloneDeep(data as any), { pickValues, omitValues, transformer })
      if (remote) {
        const res = (await fetch?.(extendCode ?? code, options)) ?? []
        mapRef.current = toMap(res, { pickValues, omitValues, transformer })
        dataMap.forEach((value, key) => {
          if (mapRef.current!.has(key)) {
            merge(mapRef.current!.get(key)!, value)
          }
        })
      } else {
        mapRef.current = dataMap
      }
    }

    function useDict(useDictOptions: UseDictOptions = {}) {
      const mergedOptions = Object.assign(
        { clone: false, immediate: true, refresh: false },
        useDictOptions
      )

      const { clone, immediate, refresh } = mergedOptions

      const loadPromiseRef = useRef<LoadPromise>(
        !clone ? globalLoadPromise ?? createPromise() : createPromise()
      )
      const mapRef = useRef<DictMap | undefined>(!clone ? maps[code] : new Map())
      const objRef = useRef<Recordable<DictItemRecord>>(Object.create(null))
      const listRef = useRef<DictItemRecord[]>([])

      const synMapRef = () => {
        const newObj = Object.create(null) as Recordable<DictItemRecord>
        const newList: DictItemRecord[] = []

        mapToObj(mapRef.current!, newObj, itemTransformer)
        mapToList(mapRef.current!, newList, itemTransformer)

        objRef.current = newObj
        listRef.current = newList
      }
      const extractE = () => {
        return Object.fromEntries(
          Array.from(mapRef.current!.keys()).map((key) => [String(key), String(key)])
        )
      }
      synMapRef()

      const [state, setState] = useState({
        map: objRef.current,
        list: listRef.current,
        E: extractE()
      })

      const load = useCallback((options?: Recordable) => {
        const oldLoadPromise = loadPromiseRef.current
        const newLoadPromise = createPromise()
        loadPromiseRef.current = newLoadPromise

        loadDict(Object.assign({}, mergedOptions, options), mapRef).then(() => {
          synMapRef()
          setState({
            map: objRef.current,
            list: listRef.current,
            E: extractE()
          })

          oldLoadPromise?.resolve(undefined)
          newLoadPromise.resolve(undefined)
        })

        return newLoadPromise
      }, [])

      const clear = useCallback(() => {
        mapRef.current?.clear()
        setState({
          map: Object.create(null),
          list: [],
          E: {}
        })
      }, [])

      const getItem = useCallback((value?: DictValue | null) => {
        return value !== null && value !== undefined ? mapRef.current?.get(value) : null
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
                if (!loaded) {
                  loaded = true
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
          ...managerExtra?.(_ctx),
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
