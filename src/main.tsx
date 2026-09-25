import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ErrorBoundary.tsx'
import { installGlobalHandlers } from './errlog.ts'

installGlobalHandlers() // window errors and unhandled rejections go to the log
// Enter in a number field takes the value and leaves the field, so the next keys go to the app again.
document.addEventListener('keydown', (e) => {
  const t = e.target
  if (e.key !== 'Enter' || !(t instanceof HTMLInputElement) || t.type !== 'number') return
  e.stopPropagation()
  t.blur()
}, true)
// ?gallery: every module face for design review (dev only; its own chunk, so the app never loads the legacy manifests)
const Gallery = import.meta.env.DEV && new URLSearchParams(location.search).has('gallery') ? lazy(() => import('./Gallery.tsx')) : null
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>{Gallery ? <Suspense><Gallery /></Suspense> : <App />}</ErrorBoundary>
  </StrictMode>,
)
