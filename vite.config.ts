import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'nogit'
  }
})()

export default defineConfig({
  plugins: [react()],
  define: { __BUILD__: JSON.stringify(`${new Date().toISOString().slice(0, 10)} ${commit}`), __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync('package.json', 'utf8')).version) },
  // Tauri loads a fixed dev URL, so fail loudly instead of hopping to another port; the watcher leaves out what is not the app.
  server: { port: 5183, strictPort: true, // 5173 is Cylix's; both can run at once
    watch: { ignored: ['**/docs/**', '**/fixtures/**', '**/lab/**', '**/crates/**', '**/src-tauri/**', '**/firmware/**'] } },
})
