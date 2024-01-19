import { computed, reactive, ref, type Ref, shallowRef, toRef, watch } from 'vue'

import { cloneDeep, isFunction, merge } from 'lodash-es'

import { createPromise } from './create-promise'
import type {
  CreateDictManager,
  DefineDict,
  DictItemRecord,
  DictMap,
  ExtraGetter,
  LoadPromise,
  Recordable
} from './type'
import { clearObj, mapToList, mapToObj, toMap } from './util'

export function createDictManager<E extends ExtraGetter>(
  managerOptions: CreateDictManager<E> = {}
) {
  const { fetch: managerFetch, extra: managerExtra } = managerOptions

  const maps = reactive<Recordable<DictMap>>({})

  function clear(code?: string) {
    if (code) {
      const dictMap = maps[code]
      dictMap && dictMap.clear()
      return
    }
    clearObj(maps)
  }

  const defineDict = ((code, defineDictOptions) => {
    const {
      data = {},
      remote = false,
      fetch = managerFetch,
      extra
    } = (isFunction(defineDictOptions) ? defineDictOptions() : defineDictOptions) ?? {}

    let managerLoaded = false
    const managerLoadPromise = shallowRef<LoadPromise>(createPromise())
    maps[code] = new Map()

    async function loadDict(options: Recordable, mapRef: Ref<DictMap>) {
      const dataMap = toMap(cloneDeep(data))
      if (remote) {
        const res = (await fetch?.(code, options)) ?? []
        mapRef.value = toMap(res)
        dataMap.forEach((value, key) => {
          if (mapRef.value.has(key)) {
            merge(mapRef.value.get(key), value)
          }
        })
      } else {
        mapRef.value = dataMap
      }
      managerLoaded = true
    }

    return (useDictOptions) => {
      useDictOptions = merge({ clone: false, immediate: true, refresh: false }, useDictOptions)

      const { clone, immediate, refresh } = useDictOptions

      let loaded = !clone ? managerLoaded : false
      const loadPromise = !clone ? managerLoadPromise : shallowRef<LoadPromise>(createPromise())

      const mapRef = !clone ? toRef(maps, code) : ref<DictMap>(new Map())
      const objRef = ref<Recordable<DictItemRecord>>({})
      const listRef = ref<DictItemRecord[]>([])

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

      if (!remote || immediate) {
        if (!loaded || refresh) {
          load()
        }
      }

      function load(options?: Recordable) {
        const oldLoadPromise = loadPromise.value
        loadPromise.value = createPromise()

        loadDict(merge({}, useDictOptions, options), mapRef).then(() => {
          oldLoadPromise.resolve()
          loadPromise.value.resolve()
        })

        return loadPromise.value
      }

      function _clear() {
        mapRef.value.clear()
      }

      const ctx = {
        map: objRef,
        list: listRef,
        E,
        loadPromise,
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
  }) as DefineDict<E>

  return { defineDict, clear }
}
