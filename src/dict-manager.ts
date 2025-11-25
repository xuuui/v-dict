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

import { createPromise } from './create-promise'
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
} from './types'
import { clearObj, cloneDeep, isFunction, mapToList, mapToObj, merge, toMap } from './util'

const warn = (msg: string) => console.warn(`[v-dict]: ${msg}`)

export function createDictManager<E extends ExtraGetter, F extends Fetch>(
  createDictManagerOptions: CreateDictManagerOptions<E, F> = {}
) {
  const { fetch: managerFetch, extra: managerExtra } = createDictManagerOptions

  const maps = reactive<Recordable<DictMap>>(Object.create(null))
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
      { data: {}, remote: false, fetch: managerFetch },
      isFunction(defineDictOptions) ? defineDictOptions() : defineDictOptions
    )
    defineDictOptionsMap.set(code, cloneDeep(_defineDictOptions))

    const { data, remote, fetch, extra } = _defineDictOptions

    const globalLoadPromise = shallowRef<LoadPromise | null>(null)
    maps[code] = new Map()

    async function loadDict(options: Recordable, mapRef: Ref<DictMap | undefined>) {
      const dataMap = toMap(cloneDeep(data as any), { pickValues, omitValues })
      if (remote) {
        const res = (await fetch?.(extendCode ?? code, options)) ?? []
        mapRef.value = toMap(res, { pickValues, omitValues })
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

      const loadPromise = !clone ? globalLoadPromise : shallowRef<LoadPromise>(createPromise())
      const mapRef = !clone ? toRef(maps, code) : ref<DictMap | undefined>()

      const objRef = ref<Recordable<DictItemRecord>>(Object.create(null))
      const listRef = ref<DictItemRecord[]>([])

      if (!remote || immediate) {
        if (clone) {
          load()
        } else {
          if (!globalLoadPromise.value) {
            globalLoadPromise.value = createPromise()
            load()
          } else {
            globalLoadPromise.value.then(() => {
              refresh && load()
            })
          }
        }
      } else {
        if (!globalLoadPromise.value) {
          globalLoadPromise.value = createPromise()
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
        mapRef.value?.clear()
      }

      watch(
        mapRef,
        (newValue) => {
          newValue ??= new Map()
          mapToObj(newValue, objRef.value)
          mapToList(newValue, listRef.value)
        },
        { deep: true, immediate: true }
      )

      const E = computed(() => {
        const result: Recordable<string> = {}
        if (!mapRef.value) return result
        for (const key of mapRef.value.keys() as unknown as string[]) {
          result[key] = key
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
        ...managerExtra?.(reactiveCtx),
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
