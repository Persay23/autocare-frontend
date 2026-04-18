// Module-level map survives StrictMode mount/unmount/remount.
// If a request for `key` is already in-flight, the same promise is returned
// so only one network request goes out regardless of how many callers attach.
const inflight = new Map<string, Promise<unknown>>()

export function dedupFetch<T>(key: string, factory: () => Promise<T>): Promise<T> {
  if (inflight.has(key)) return inflight.get(key) as Promise<T>
  const promise = factory().finally(() => inflight.delete(key))
  inflight.set(key, promise)
  return promise
}
