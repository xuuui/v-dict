<!--
 * @Date: 2024-01-12 02:58:43
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
-->

# Vue3 & React Dict Manager

## 目录

- [Vue](#vue)
- [React](#react)

## Installation

```sh
npm i v-dict
```

## Vue

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

// clear dict data
// dm.clear('REMOTE_STATUS')

// clear all dict data
// dm.clear()
```

### xx.vue

```vue
<template>
  <div>
    {{ statusDict.E }}
    {{ statusDict.map }}
    {{ statusDict.list }}
    {{ statusDict.getLabel(statusDict.E.ENABLED) }}
    {{ statusDict.getItem(statusDict.E.DISABLED) }}
  </div>
</template>

<script setup lang="ts">
import { useRemoteStatusDict } from './dict'
import { onMounted } from 'vue'

const statusDict = useRemoteStatusDict({
  // Data sharing by default, independent data source when clone is true
  clone: true,
  // Whether the remote dictionary loads data immediately
  immediate: false,
  // whether to reload
  refresh: false
}) // statusDict is reactive!!!

const { E, map, list } = statusDict

/* 
E: {
  ENABLED: 'ENABLED',
  DISABLED: 'DISABLED'
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
  // clear dict data
  // statusDict.clear()
})
</script>
```

## React

### dict.ts

```ts
import { createDictManager, defineDictData } from 'v-dict/react'

export const dm = createDictManager({
  fetch: (code) =>
    Promise.resolve([
      { label: 'xx', value: 'xx' },
      { label: 'xx', value: 'xx' }
    ]),
  extra: ({ map }) => {
    return {
      getLabel: (value: string) => map[value]?.label
    }
  }
})

export const useStatusDict = dm.defineDict('STATUS', {
  data: defineDictData({
    ENABLED: {
      label: 'Enabled',
      color: 'green'
    },
    DISABLED: {
      label: 'Disabled',
      color: 'red'
    }
  })
})

export const useRemoteStatusDict = dm.defineDict('REMOTE_STATUS', {
  remote: true,
  fetch: (code) =>
    Promise.resolve([
      { label: 'Enabled', value: 'ENABLED', color: 'green' },
      { label: 'Disabled', value: 'DISABLED', color: 'red' }
    ]),
  extra: ({ map }) => {
    return {
      getItemDetail: (value: string) => map[value]
    }
  }
})

// clear one dict
// dm.clear('REMOTE_STATUS')

// clear all dicts
// dm.clear()
```

### xx.tsx

```tsx
import { useEffect } from 'react'
import { useRemoteStatusDict } from './dict'

export default function Demo() {
  const statusDict = useRemoteStatusDict({
    // same as above
    clone: false,
    // same as above
    immediate: true,
    // same as above
    refresh: false
  })

  return (
    <div>
      <div>{E.ENABLED}</div>
      <div>{map[E.ENABLED]?.label}</div>
      <div>{statusDict.getLabel(E.ENABLED)}</div>
      <div>{statusDict.getItem(E.DISABLED)?.color}</div>
      <div>{list.length}</div>
    </div>
  )
}
```
