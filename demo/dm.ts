/*
 * @Date: 2025-02-17 03:16:38
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */
import { createDictManager } from '../src'

export function fetch(
  code: string,
  options: { c?: string } = {}
): Array<{ label: string; value: string }> {
  return []
}

export const dm = createDictManager({
  fetch
})
