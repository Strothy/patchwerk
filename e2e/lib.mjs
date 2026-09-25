// Shared helpers for the e2e suites.

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Polls `probe` (sync or async) until it returns a truthy value, then returns that value; throws after `timeoutMs`.
 * Use it instead of a fixed sleep wherever the app has something observable to wait for: `await until(() => ev(...))`.
 */
export async function until(probe, { timeoutMs = 10_000, everyMs = 50, what = 'condition' } = {}) {
  const t0 = Date.now()
  for (;;) {
    const v = await probe()
    if (v) return v
    if (Date.now() - t0 > timeoutMs) throw new Error(`Timed out after ${timeoutMs} ms waiting for ${what}`)
    await sleep(everyMs)
  }
}
