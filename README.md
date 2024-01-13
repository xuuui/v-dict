<!--
 * @Date: 2024-01-12 02:58:43
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
-->

# Vue3 Dict Manager

## Installation

```sh
npm i v-dict
```

## Examples

### dict.ts

```ts
import { createDictManager, defineDictData } from 'v-dict'

export const dm = createDictManager({
  // method to fetch remote dict
  fetch: (code) =>
    Promise.resolve([
      { label: 'xx', value: 'xx' },
      { label: 'xx', value: 'xx' }
    ]),
  // extra attr
  extra: ({ loadPromise, load, list, map, E }) => {
    return {
      getLabel: (value: string) => map[value]?.label
    }
  }
})

// same api for local dict or remote dict
// local
export const useStatusDict = dm.defineDict('STATUS', {
  data: defineDictData({
    ENABLED: {
      label: 'Enabled',
      // extra attr
      color: 'green'
    },
    DISABLED: {
      label: 'Disabled',
      color: 'red'
    }
  })
})
// remote
export const useRemoteStatusDict = dm.defineDict('REMOTE_STATUS', {
  remote: true,
  // overwrite dm fetch
  fetch: (code) =>
   // code = 'REMOTE_STATUS'
    Promise.resolve([
      { label: 'Enabled', value: 'ENABLED', color: 'green' },
      { label: 'Disabled', value: 'DISABLED' color: 'red' }
    ]),
  // merge dm extra
  extra: ({ loadPromise, load, list, map, E }) => {
    return {
      getItem: (value: string) => map[value]
    }
  }
})

```

### xx.vue

```vue
<template>
  <div>
    {{ statusDict.E }}
    {{ statusDict.map }}
    {{ statusDict.list }}
    {{ statusDict.getLabel(E.ENABLED) }}
    {{ statusDict.getItem(E.DISABLED) }}
  </div>
</template>

<script setup lang="ts">
import { useRemoteStatusDict } from './dict'
import { onMounted } from 'vue'

const statusDict = useRemoteStatusDict({
  // Data sharing by default, independent data source when clone is true
  clone: true,
  // Whether the remote dictionary loads data immediately
  immediate: false
}) // statusDict is reactive!!!

const { E, map, list } = statusDict

/* 
E: {
  ENABLED: ENABLED,
  DISABLED: DISABLED
}

map: {
  ENABLED: {
    label: 'Enabled',
    value: 'ENABLED',
    color: 'green'
  },
  DISABLED: {
    label: 'Disabled',
    value: 'DISABLED',
    color: 'red'
  }
}

list: [
  {
    label: 'Enabled',
    value: 'ENABLED',
    color: 'green'
  },
  {
    label: 'Disabled',
    value: 'DISABLED',
    color: 'red'
  }
]
*/

onMounted(async () => {
  await statusDict.load()

  await statusDict.loadPromise // immediate = true, using loadPromise to wait load
  // do after dict load
  console.log(statusDict.list)
})
</script>
```
