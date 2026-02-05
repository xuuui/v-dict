/*
 * @Date: 2024-01-10 00:02:57
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */
import { exec } from 'node:child_process'

import { defineConfig } from 'tsup'

const BUILD_TYPE_COMMAND = 'build:type'

const externals = {
  common: ['vue', 'lodash-es', 'react']
}

function buildType() {
  return new Promise<void>((resolve, reject) => {
    const command = `npm run ${BUILD_TYPE_COMMAND}`
    exec(command, (err) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
}

export default defineConfig(
  ({ target = 'es2018', watch = false, minify = false, platform = 'browser' }) => {
    return {
      target,
      clean: true,
      dts: false,
      entry: ['src/index.ts', 'src/react/index.ts'],
      outDir: 'dist',
      format: ['cjs', 'esm'],
      minify,
      treeshake: true,
      tsconfig: 'tsconfig.json',
      sourcemap: false,
      external: Object.values(externals).flat(),
      watch,
      platform,
      onSuccess: buildType
    }
  }
)
