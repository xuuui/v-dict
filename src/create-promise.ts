/*
 * @Date: 2024-01-13 21:58:43
 * @Author: fangruiyi
 * @LastEditors: fangruiyi
 * @Description:
 */
const noop = () => {}

export type Resolve<T> = (value: T | PromiseLike<T>) => void

export type Reject = (reason?: any) => void

export type CreatePromiseReturn<T> = Promise<T> & {
  resolve: Resolve<T>
  reject: Reject
}

export function createPromise<T = any>(
  executor?: (resolve: Resolve<T>, reject: Reject) => void
): CreatePromiseReturn<T> {
  let resolve: Resolve<T> = noop
  let reject: Reject = noop

  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
    executor?.(_resolve, _reject)
  }) as CreatePromiseReturn<T>

  promise.resolve = resolve
  promise.reject = reject

  return promise
}
