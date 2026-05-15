export function useCancellableAsync() {
  let version = 0
  function start() { return ++version }
  function isCurrent(v) { return v === version }
  return { start, isCurrent }
}
