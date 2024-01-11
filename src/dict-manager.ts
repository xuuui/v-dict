import { computed, reactive, ref, type Ref, shallowRef, toRef, watch } from 'vue'

import { cloneDeep, isFunction, merge } from 'lodash-es'

import type {
  CreateDictManager,
  DefineDict,
  DictItemRecord,
  DictMap,
  ExtraGetter,
  LoadPromise,
  Recordable
} from './type'
import { createPromise, mapToList, mapToObj, toMap } from './util'

export function createDictManager<E extends ExtraGetter>(options?: CreateDictManager<E>) {
  const { fetch: managerFetch, extra: managerExtra } = options ?? {}

  const maps = reactive<Recordable<DictMap>>({})

  const defineDict = ((code, options) => {
    const {
      data,
      remote = false,
      fetch = managerFetch,
      extra
    } = (isFunction(options) ? options() : options) ?? {}

    const managerLoadPromise = shallowRef<LoadPromise | undefined>(undefined)
    maps[code] = new Map()

    async function loadDict(ctx: any, mapRef: Ref<DictMap>) {
      const dataMap = toMap(cloneDeep(data ?? {}))
      if (remote) {
        await fetch?.(code, ctx).then((res) => {
          mapRef.value = toMap(res ?? [])
          dataMap.forEach((value, key) => {
            if (mapRef.value.has(key)) {
              merge(mapRef.value.get(key), value)
            }
          })
        })
      } else {
        mapRef.value = dataMap
      }
    }

    return (useDictOptions) => {
      useDictOptions = merge({ clone: false, immediate: false }, useDictOptions)

      const { clone, immediate } = useDictOptions

      const loadPromise = !clone
        ? managerLoadPromise
        : shallowRef<LoadPromise | undefined>(undefined)

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

      const E = computed(() =>
        [...mapRef.value.keys()].reduce((ret, key) => {
          ret[key] = key
          return ret
        }, {} as Recordable<string>)
      )

      if (remote) {
        immediate && load()
      } else {
        load()
      }

      function load(ctx?: Recordable) {
        loadPromise.value = createPromise()

        loadDict(merge({}, useDictOptions, ctx), mapRef).then(() => {
          loadPromise.value?.resolve()
        })

        return loadPromise.value
      }

      const ctx = {
        map: objRef,
        list: listRef,
        E,
        loadPromise
      }

      return reactive({
        ...ctx,
        load,
        ...managerExtra?.(reactive(ctx) as any),
        ...extra?.(reactive(ctx) as any)
      })
    }
  }) as DefineDict<E>

  return { defineDict }
}
