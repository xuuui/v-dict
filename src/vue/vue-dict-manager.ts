import {
  computed,
  reactive,
  readonly,
  ref,
  type Ref,
  shallowRef,
  type ShallowRef,
  toRef,
  watch
} from 'vue'

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

  const maps = reactive<Recordable<DictMap>>(Object.create(null))
  const defineDictOptionsMap = new Map<string, Recordable>()

  function clear(code?: string) {
    if (code) {
      maps[code]?.clear()
      return
    }
    Object.values(maps).forEach((map) => map.clear())
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

    async function loadDict(options: Recordable, mapRef: Ref<DictMap | undefined>) {
      const dataMap = toMap(cloneDeep(data as any), { pickValues, omitValues, transformer })
      if (remote) {
        const res = (await fetch?.(extendCode ?? code, options)) ?? []
        mapRef.value = toMap(res, { pickValues, omitValues, transformer })
        dataMap.forEach((value, key) => {
          if (mapRef.value!.has(key)) {
            merge(mapRef.value!.get(key)!, value)
          }
        })
      } else {
        mapRef.value = dataMap
      }
    }

    function useDict(useDictOptions: UseDictOptions) {
      useDictOptions = Object.assign(
        { clone: false, immediate: true, refresh: false },
        useDictOptions
      )
      const { clone, immediate, refresh } = useDictOptions

      const loadPromise = shallowRef<LoadPromise | null>(
        !clone ? globalLoadPromise : createPromise()
      )
      const mapRef = !clone ? toRef(maps, code) : ref<DictMap>(new Map())

      const objRef = ref<Recordable<DictItemRecord>>(Object.create(null))
      const listRef = ref<DictItemRecord[]>([])

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
          globalLoadPromise.resolve()
        }
      }

      function load(options?: Recordable) {
        const oldLoadPromise = loadPromise.value
        loadPromise.value = createPromise()

        loadDict(Object.assign({}, useDictOptions, options), mapRef).then(() => {
          oldLoadPromise!.resolve()
          loadPromise.value!.resolve()
        })

        return loadPromise.value
      }

      function _clear() {
        mapRef.value.clear()
      }

      watch(
        mapRef,
        (newValue) => {
          newValue ??= new Map()
          mapToObj(newValue, {
            obj: objRef.value,
            itemTransformer
          })
          mapToList(newValue, {
            list: listRef.value,
            itemTransformer
          })
        },
        { deep: true, immediate: true }
      )

      const E = computed(() => {
        const result: Recordable<string | number> = {}
        if (!mapRef.value) return result
        for (const key of mapRef.value.keys() as unknown as string[]) {
          result[key] = transformer?.(key) ?? key
        }
        return result
      })

      function getItem(value?: DictValue | null) {
        return value !== null && value !== undefined ? mapRef.value?.get(value) : null
      }

      const ctx = {
        map: objRef,
        list: listRef,
        E,
        loadPromise: loadPromise as ShallowRef<LoadPromise>,
        load,
        getItem,
        clear: _clear
      }
      const reactiveCtx = reactive(ctx)

      return reactive({
        ...ctx,
        // @ts-ignore
        ...managerExtra?.(reactiveCtx),
        // @ts-ignore
        ...extra?.(reactiveCtx)
      })
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

  return { defineDict, clear, maps: readonly(maps) }
}

// const data = {
//   SUCCESS: {
//     label: '成功',
//     value: 1,
//     color: 's'
//   },
//   FAIL: {
//     label: '失败',
//     value: 2,
//     color: 3
//   }
// }
// const dm = createDictManager({
//   fetch: async (): Promise<DictItem[]> => {
//     return []
//   }
// })
// const testDict = dm.defineDict('test', {
//   data,
//   extra: (dict) => {
//     return {
//       getLabel: (value: any) => {
//         return dict.map[value]?.label
//       },
//       getItem: (value: any): (DictItem & Recordable) | undefined => {
//         return dict.map[value] as any
//       }
//     }
//   }
// })
