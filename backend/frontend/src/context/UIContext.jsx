import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { subscribeToGlobalAlerts } from '../api/websocketService'

const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const pushToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type: 'success', ...toast }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, toast.duration || (toast.type === 'error' ? 6000 : 3500))
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    // Listen for global live tamper alerts and critical system security events
    const unsub = subscribeToGlobalAlerts((alert) => {
      if (alert.event_type === 'TAMPER_ALERT' || alert.is_tampered) {
        pushToast({
          type: 'error',
          title: '🚨 CRITICAL TAMPER ALERT',
          message: alert.message || `Tamper detected in ${alert.document_title || 'Document'} (${alert.reason})`,
          duration: 8000,
        })
      } else if (alert.event_type === 'ANOMALY_ALERT') {
        pushToast({
          type: 'warning',
          title: '⚠️ Behavioral Anomaly Flagged',
          message: alert.message || `Unusual access activity detected for ${alert.username}`,
          duration: 6000,
        })
      }
    })

    return () => {
      unsub()
    }
  }, [pushToast])

  return (
    <UIContext.Provider
      value={{ toasts, pushToast, dismissToast, sidebarOpen, setSidebarOpen }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
