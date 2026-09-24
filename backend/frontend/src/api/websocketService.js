// -----------------------------------------------------------------------------
// Real-Time WebSocket Client Service for SecureDocs SDMS
// -----------------------------------------------------------------------------

function getWebSocketBaseUrl() {
  if (import.meta.env?.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL.replace(/\/$/, '')
  }
  if (import.meta.env?.VITE_API_URL) {
    try {
      const url = new URL(import.meta.env.VITE_API_URL)
      const wsProto = url.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${wsProto}//${url.host}`
    } catch (_) {}
  }
  const isSecure = window.location.protocol === 'https:'
  const proto = isSecure ? 'wss:' : 'ws:'
  
  // If frontend is running on Vite dev server (e.g. localhost:5173), point to Django on port 8000
  if (window.location.port === '5173' || window.location.port === '3000') {
    return `${proto}//${window.location.hostname}:8000`
  }
  return `${proto}//${window.location.host}`
}

function getAuthToken() {
  const sessionRaw = sessionStorage.getItem('securedocs.session')
  if (!sessionRaw) return null
  try {
    const session = JSON.parse(sessionRaw)
    return session?.token || null
  } catch (_) {
    return null
  }
}

class CaseWebSocketSubscription {
  constructor(caseId, onEvent, onTamperAlert) {
    this.caseId = caseId
    this.onEvent = onEvent
    this.onTamperAlert = onTamperAlert
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectDelay = 10000
    this.isClosedManually = false
    this.seenLogIds = new Set()
    this.pingInterval = null

    this.connect()
  }

  connect() {
    if (this.isClosedManually) return

    const token = getAuthToken()
    if (!token) {
      console.warn(`[WS] No auth token available for case ${this.caseId}`)
      return
    }

    const baseUrl = getWebSocketBaseUrl()
    const url = `${baseUrl}/ws/audit/case/${this.caseId}/?token=${encodeURIComponent(token)}`

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log(`[WS] Connected to live case audit stream: ${this.caseId}`)
        this.reconnectAttempts = 0
        
        // Request resynchronization for any logs generated while disconnected
        this.ws.send(JSON.stringify({ action: 'RESYNC' }))

        // Start ping heartbeat
        if (this.pingInterval) clearInterval(this.pingInterval)
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ action: 'PING' }))
          }
        }, 25000)
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (e) {
          console.error('[WS] Error parsing message:', e)
        }
      }

      this.ws.onclose = (e) => {
        if (this.pingInterval) clearInterval(this.pingInterval)
        if (!this.isClosedManually) {
          console.log(`[WS] Case ${this.caseId} socket closed (${e.code}). Reconnecting...`)
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (err) => {
        console.warn(`[WS] WebSocket error on case ${this.caseId}:`, err)
      }
    } catch (e) {
      console.error('[WS] Connection exception:', e)
      this.scheduleReconnect()
    }
  }

  handleMessage(data) {
    if (data.type === 'PONG' || data.type === 'CONNECTION_ESTABLISHED') {
      return
    }

    if (data.type === 'RESYNC_RESPONSE' && Array.isArray(data.logs)) {
      data.logs.forEach((log) => {
        if (log.log_id && !this.seenLogIds.has(log.log_id)) {
          this.seenLogIds.add(log.log_id)
          if (this.onEvent) this.onEvent(log)
        }
      })
      return
    }

    if (data.event_type === 'TAMPER_ALERT' || data.type === 'TAMPER_ALERT' || data.is_tampered) {
      console.warn(`[WS] ⚠️ LIVE TAMPER ALERT RECEIVED FOR CASE ${this.caseId}:`, data)
      if (this.onTamperAlert) {
        this.onTamperAlert(data)
      }
      if (this.onEvent) {
        this.onEvent(data)
      }
      return
    }

    if (data.event_type === 'NEW_LOG_ENTRY' || data.type === 'NEW_LOG_ENTRY') {
      const log = data.payload || data.log || data
      if (log.log_id && this.seenLogIds.has(log.log_id)) {
        return // deduplicate
      }
      if (log.log_id) {
        this.seenLogIds.add(log.log_id)
      }
      if (this.onEvent) {
        this.onEvent(log)
      }
    }
  }

  scheduleReconnect() {
    if (this.isClosedManually) return
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay)
    this.reconnectAttempts++
    setTimeout(() => this.connect(), delay)
  }

  close() {
    this.isClosedManually = true
    if (this.pingInterval) clearInterval(this.pingInterval)
    if (this.ws) {
      try {
        this.ws.close()
      } catch (_) {}
      this.ws = null
    }
  }
}

class AlertsWebSocketSubscription {
  constructor(onAlert) {
    this.onAlert = onAlert
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectDelay = 10000
    this.isClosedManually = false
    this.pingInterval = null

    this.connect()
  }

  connect() {
    if (this.isClosedManually) return

    const token = getAuthToken()
    if (!token) return

    const baseUrl = getWebSocketBaseUrl()
    const url = `${baseUrl}/ws/audit/alerts/?token=${encodeURIComponent(token)}`

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        if (this.pingInterval) clearInterval(this.pingInterval)
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ action: 'PING' }))
          }
        }, 25000)
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'PONG' || data.type === 'CONNECTION_ESTABLISHED') return
          if (this.onAlert) {
            this.onAlert(data)
          }
        } catch (_) {}
      }

      this.ws.onclose = () => {
        if (this.pingInterval) clearInterval(this.pingInterval)
        if (!this.isClosedManually) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = () => {}
    } catch (_) {
      this.scheduleReconnect()
    }
  }

  scheduleReconnect() {
    if (this.isClosedManually) return
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay)
    this.reconnectAttempts++
    setTimeout(() => this.connect(), delay)
  }

  close() {
    this.isClosedManually = true
    if (this.pingInterval) clearInterval(this.pingInterval)
    if (this.ws) {
      try {
        this.ws.close()
      } catch (_) {}
      this.ws = null
    }
  }
}

class GlobalAuditWebSocketSubscription {
  constructor(onLog, onTamperAlert) {
    this.onLog = onLog
    this.onTamperAlert = onTamperAlert
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectDelay = 10000
    this.isClosedManually = false
    this.seenLogIds = new Set()
    this.pingInterval = null

    this.connect()
  }

  connect() {
    if (this.isClosedManually) return

    const token = getAuthToken()
    if (!token) return

    const baseUrl = getWebSocketBaseUrl()
    const url = `${baseUrl}/ws/audit/logs/?token=${encodeURIComponent(token)}`

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        if (this.pingInterval) clearInterval(this.pingInterval)
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ action: 'PING' }))
          }
        }, 25000)
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'PONG' || data.type === 'CONNECTION_ESTABLISHED') return

          if (data.event_type === 'TAMPER_ALERT' || data.type === 'TAMPER_ALERT' || data.is_tampered) {
            if (this.onTamperAlert) this.onTamperAlert(data)
            return
          }

          const log = data.payload || data.log || data
          if (log.log_id && this.seenLogIds.has(log.log_id)) return
          if (log.log_id) this.seenLogIds.add(log.log_id)

          if (this.onLog) {
            this.onLog(log)
          }
        } catch (_) {}
      }

      this.ws.onclose = () => {
        if (this.pingInterval) clearInterval(this.pingInterval)
        if (!this.isClosedManually) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = () => {}
    } catch (_) {
      this.scheduleReconnect()
    }
  }

  scheduleReconnect() {
    if (this.isClosedManually) return
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay)
    this.reconnectAttempts++
    setTimeout(() => this.connect(), delay)
  }

  close() {
    this.isClosedManually = true
    if (this.pingInterval) clearInterval(this.pingInterval)
    if (this.ws) {
      try {
        this.ws.close()
      } catch (_) {}
      this.ws = null
    }
  }
}

export function subscribeToCaseAudit(caseId, onEvent, onTamperAlert) {
  const sub = new CaseWebSocketSubscription(caseId, onEvent, onTamperAlert)
  return () => sub.close()
}

export function subscribeToGlobalAlerts(onAlert) {
  const sub = new AlertsWebSocketSubscription(onAlert)
  return () => sub.close()
}

export function subscribeToGlobalAudit(onLog, onTamperAlert) {
  const sub = new GlobalAuditWebSocketSubscription(onLog, onTamperAlert)
  return () => sub.close()
}
