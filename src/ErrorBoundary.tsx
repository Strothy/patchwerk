import { Component, type ErrorInfo, type ReactNode } from 'react'
import { report } from './errlog.ts'

/** A render error shows this instead of a blank window: what went wrong, Copy details, Reload. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; stack: string }> {
  state = { error: null as Error | null, stack: '' }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ stack: `${error.stack ?? error.message}\n${info.componentStack ?? ''}` })
    report('error', `Render error: ${error.stack ?? error.message}${info.componentStack ?? ''}`)
  }
  render() {
    const { error, stack } = this.state
    if (!error) return this.props.children
    const details = `Patchwerk render error\n${stack || error.stack || error.message}`
    return (
      <div className="crash" role="alert">
        <h2>Something went wrong</h2>
        <p>Patchwerk hit an error it could not draw past. The engine keeps running; Reload redraws the page.</p>
        <pre>{error.message}</pre>
        <p>
          <button className="btn on" onClick={() => location.reload()}>Reload</button>{' '}
          <button className="btn" onClick={() => navigator.clipboard.writeText(details)}>Copy details</button>
        </p>
      </div>
    )
  }
}
