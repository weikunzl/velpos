export interface CancellableAsync {
  start: () => number
  isCurrent: (version: number) => boolean
}

export function useCancellableAsync(): CancellableAsync {
  let version = 0
  function start(): number {
    version += 1
    return version
  }
  function isCurrent(v: number): boolean {
    return v === version
  }
  return { start, isCurrent }
}
