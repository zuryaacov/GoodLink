import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/common/ToastProvider.jsx'
import AccessibilityWidget from './components/accessibility/AccessibilityWidget.jsx'
import { hydrateAccessibilityFromStorage } from './lib/accessibilityPreferences.js'

// Silence console writes across the frontend bundle.
;['log', 'info', 'warn', 'error', 'debug', 'trace'].forEach((method) => {
  if (typeof console?.[method] === 'function') {
    console[method] = () => {}
  }
})

hydrateAccessibilityFromStorage()

// Initialize Sentry
Sentry.init({
  dsn: 'https://6cef5c9628172a6078d7e41820c3bb32@o4510770008293376.ingest.us.sentry.io/4510770025398272',
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  // Disable SDK log forwarding to keep console output silent.
  enableLogs: false,
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
        <AccessibilityWidget />
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
