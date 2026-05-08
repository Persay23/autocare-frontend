// Module-level map survives StrictMode mount/unmount/remount.
// If a request for `key` is already in-flight, the same promise is returned
// so only one network request goes out regardless of how many callers attach.
// Key is kept alive for 200 ms after resolve so that StrictMode's synchronous
// cleanup → remount cycle doesn't start a duplicate request when the response
// arrives faster than the remount.
const inflight = new Map<string, Promise<unknown>>()

export function dedupFetch<T>(key: string, factory: () => Promise<T>): Promise<T> {
  if (inflight.has(key)) return inflight.get(key) as Promise<T>
  const promise = factory().finally(() => { setTimeout(() => inflight.delete(key), 200) })
  inflight.set(key, promise)
  return promise
}
