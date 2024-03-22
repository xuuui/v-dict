import { computed, reactive, ref, type Ref, shallowRef, type ShallowRef, toRef, watch } from 'vue'

import { cloneDeep, isFunction, merge } from 'lodash-es'

import { createPromise } from './create-promise'
import type {
  CreateDictManager,
  DefineDict,
  DictItemRecord,
  DictMap,
  ExtraGetter,
  LoadPromise,
  UseDictOptions
} from './types'
import { clearObj, mapToList, mapToObj, toMap } from './util'

const warn = (msg: string) => console.warn(`[v-dict]: ${msg}`)

export function createDictManager<E extends ExtraGetter>(
  managerOptions: CreateDictManager<E> = {}
) {
  const { fetch: managerFetch, extra: managerExtra } = managerOptions

  const maps = reactive<Recordable<DictMap>>(Object.create(null))
  const defineDictOptionsMap = new Map<string, Recordable>()

  function clear(code?: string) {
    if (code) {
      maps[code]?.clear()
      return
    }
    clearObj(maps)
  }

  function _defineDict(
    internalOptions: { pickValues?: string[]; omitValues?: string[] },
    code: string,
    defineDictOptions: Parameters<DefineDict<E>>[1]
  ) {
    if (maps[code]) {
      warn(`code "${code}" already exists`)
    }
    const { pickValues, omitValues } = internalOptions

    const options: Parameters<DefineDict<E>>[1] = Object.assign(
      { data: {}, remote: false, fetch: managerFetch },
      isFunction(defineDictOptions) ? defineDictOptions() : defineDictOptions
    )
    defineDictOptionsMap.set(code, options)

    const { data, remote, fetch, extra } = options

    const globalLoadPromise = shallowRef<LoadPromise | null>(null)
    maps[code] = new Map()

    async function loadDict(options: Recordable, mapRef: Ref<DictMap>) {
      const dataMap = toMap(cloneDeep(data as any), { pickValues, omitValues })
      if (remote) {
        const res = (await fetch?.(code, options)) ?? []
        mapRef.value = toMap(res, { pickValues, omitValues })
        dataMap.forEach((value, key) => {
          if (mapRef.value.has(key)) {
            merge(mapRef.value.get(key), value)
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
      const mapRef = !clone ? toRef(maps, code) : ref<DictMap>(new Map())

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
        mapRef.value.clear()
      }

      watch(
        mapRef,
        (newValue) => {
          mapToObj(newValue, objRef.value)
          mapToList(newValue, listRef.value)
        },
        { deep: true, immediate: true }
      )

      const E = computed(() => {
        const result: Recordable<string> = {}
        for (const key of mapRef.value.keys()) {
          result[key] = key
        }
        return result
      })

      const ctx = {
        map: objRef,
        list: listRef,
        E,
        loadPromise: loadPromise as ShallowRef<LoadPromise>,
        load,
        clear: _clear
      }
      const reactiveCtx = reactive(ctx)

      return reactive({
        ...ctx,
        ...managerExtra?.(reactiveCtx),
        ...extra?.(reactiveCtx)
      })
    }

    const dictCode = code

    useDict.extend = (
      code: string,
      extendOptions?: {
        pickValues?: string[]
        omitValues?: string[]
      }
    ) => {
      const { pickValues, omitValues } = extendOptions ?? {}
      const options = defineDictOptionsMap.get(dictCode)
      return _defineDict.bind(null, { pickValues, omitValues }, code, options)
    }

    return useDict
  }

  const defineDict = _defineDict.bind(null, {}) as unknown as DefineDict<E>

  return { defineDict, clear }
}

// const dm = createDictManager({
//   fetch: () => {
//     return []
//   },
//   extra: () => {
//     return {
//       msg: 'hello'
//     }
//   }
// })

// const useDict = dm.defineDict('TEST', {
//   data: {
//     YES: {
//       label: 'YES'
//     },
//     NO: {
//       label: 'NO'
//     }
//   },
//   fetch: async (_: string, { x }: { x: number }) => {
//     return [{ label: '3', value: 's', h: 4 }] as Array<{
//       label: string
//       value: string
//       h?: number
//     }>
//   },
//   extra: () => {
//     return {
//       self: 'x'
//     }
//   }
// })

// const useX = useDict.extend('codex', {
//   omitValues: ['YES']
// })

// const dict = useX()
