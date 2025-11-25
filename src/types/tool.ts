export type Recordable<T = any> = Record<string, T>
export type Nil = undefined | null
export type MaybePromise<T> = T | Promise<T>
export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {}
export type OptionalRequired<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>
export type Getter<T> = () => T
export type MaybeGetter<T> = T | Getter<T>
export type AnyFn<Return = any, Args extends unknown[] = any[]> = (...args: Args) => Return
export type PlainObject<T = any> = Record<PropertyKey, any>
