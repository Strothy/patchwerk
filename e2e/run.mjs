// Runs every e2e suite against the running app and prints one table:
//   1. npx tauri dev --config tauri.devtools.json   2. node e2e/run.mjs [name…]
// A suite is any e2e/*.mjs except the helpers; names narrow the run (`node e2e/run.mjs layout keymap`). Suites run
// one after the other (they share the app). Exit code = number of failed suites.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const HELPERS = new Set(['cdp.mjs', 'lib.mjs', 'run.mjs'])
const wanted = process.argv.slice(2)
const suites = readdirSync(here)
  .filter((f) => f.endsWith('.mjs') && !HELPERS.has(f))
  .map((f) => f.replace(/\.mjs$/, ''))
  .filter((n) => !wanted.length || wanted.includes(n))
  .sort()

const rows = []
for (const name of suites) {
  const t0 = Date.now()
  const r = spawnSync(process.execPath, [join(here, `${name}.mjs`)], { encoding: 'utf8', timeout: 10 * 60_000 })
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`
  const pass = (out.match(/^\s+PASS /gm) ?? []).length
  const fail = (out.match(/^\s+FAIL /gm) ?? []).length
  const crashed = r.status !== 0 && !fail // a thrown error, a timeout, or an app that was not there
  const firstFail = out.split('\n').find((l) => /^\s+FAIL /.test(l))?.trim().slice(0, 90) ?? (crashed ? out.trim().split('\n').filter(Boolean).slice(-1)[0]?.slice(0, 90) : '')
  rows.push({ suite: name, pass, fail, status: crashed ? 'CRASH' : fail ? 'FAIL' : 'ok', s: ((Date.now() - t0) / 1000).toFixed(1), note: firstFail })
  process.stdout.write(`${rows.at(-1).status.padEnd(6)} ${name.padEnd(14)} ${String(pass).padStart(3)} pass ${String(fail).padStart(3)} fail  ${rows.at(-1).s.padStart(6)} s  ${firstFail}\n`)
}
const bad = rows.filter((r) => r.status !== 'ok')
console.log(`\n${rows.length} suites, ${rows.reduce((n, r) => n + r.pass, 0)} checks passed, ${rows.reduce((n, r) => n + r.fail, 0)} failed${bad.length ? `; not green: ${bad.map((r) => r.suite).join(', ')}` : '; all green'}`)
process.exitCode = bad.length
