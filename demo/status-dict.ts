/*
 * @Date: 2025-02-17 03:18:44
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */
import { dm, fetch } from './dm'

export const useStatusDict = dm.defineDict('STATUS', {
  data: {
    LOADING: {
      value: 1,
      color: 'red'
    },
    SUCCESS: {
      value: 2,
      color: 33
    },
    ERROR: {
      color: 'red',
      value: null
    }
  }
})

const statusDict = useStatusDict()

statusDict.E
statusDict.list
statusDict.map
statusDict.getItem
statusDict.load
statusDict.loadPromise
