import { invoke } from '@tauri-apps/api/core'

/** The last errors and notices the app saw, newest last. Kept in memory only. */
export const recentErrors: string[] = []
const KEEP = 50

/** Remembers a line and writes it to the app's log (the terminal in dev, a file in a release). */
export function report(level: 'error' | 'warn' | 'info', text: string) {
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${text}`
  recentErrors.push(line)
  if (recentErrors.length > KEEP) recentErrors.splice(0, recentErrors.length - KEEP)
  invoke('log_line', { level, text }).catch(() => {}) // no backend (a plain browser tab): the memory copy is all there is
}

/** Window errors and unhandled promise rejections: into the log, never silently lost. */
export function installGlobalHandlers() {
  window.addEventListener('error', (e) => report('error', `${e.message} (${e.filename}:${e.lineno})${e.error?.stack ? '\n' + e.error.stack : ''}`))
  window.addEventListener('unhandledrejection', (e) => report('error', `Unhandled rejection: ${e.reason instanceof Error ? e.reason.stack ?? e.reason.message : String(e.reason)}`))
  document.addEventListener('securitypolicyviolation', (e) => report('error', `CSP blocked ${e.blockedURI || '(inline)'} (${e.violatedDirective}) at ${e.sourceFile}:${e.lineNumber}`))
}
