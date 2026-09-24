// -----------------------------------------------------------------------------
// Real API Client connecting to Django REST Framework backend at /api
// -----------------------------------------------------------------------------

export const API_BASE = (import.meta.env?.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') + '/api'

function getAuthHeaders(isMultipart = false) {
  const sessionRaw = sessionStorage.getItem('securedocs.session')
  const headers = {}
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json'
  }
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw)
      if (session?.token) {
        headers['Authorization'] = `Bearer ${session.token}`
      }
    } catch (_) {}
  }
  return headers
}

async function handleResponse(res) {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`
    try {
      const errData = await res.json()
      if (errData?.error?.message) {
        errorMsg = errData.error.message
      } else if (errData?.detail) {
        errorMsg = errData.detail
      } else if (typeof errData === 'object') {
        errorMsg = JSON.stringify(errData)
      }
    } catch (_) {}
    const err = new Error(errorMsg)
    err.status = res.status
    throw err
  }
  if (res.status === 204) return null
  return await res.json()
}

// -----------------------------------------------------------------------------
// AUTH & USERS
// -----------------------------------------------------------------------------
export async function loginRequest(username, password) {
  const res = await fetch(`${API_BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await handleResponse(res)
  return {
    user: data.user,
    token: data.access_token,
    refreshToken: data.refresh_token,
  }
}

export async function registerRequest(userData) {
  const res = await fetch(`${API_BASE}/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  })
  return await handleResponse(res)
}

export async function fetchUsers(role) {
  const url = role ? `${API_BASE}/auth/users/?role=${encodeURIComponent(role)}` : `${API_BASE}/auth/users/`
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

export async function createUser(userData) {
  const res = await fetch(`${API_BASE}/auth/users/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  })
  return await handleResponse(res)
}

export async function updateUser(userId, data) {
  const res = await fetch(`${API_BASE}/auth/users/${userId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  return await handleResponse(res)
}

export async function deleteUser(userId) {
  const res = await fetch(`${API_BASE}/auth/users/${userId}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/auth/stats/`, {
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

// -----------------------------------------------------------------------------
// CASES
// -----------------------------------------------------------------------------
export async function fetchCases() {
  const res = await fetch(`${API_BASE}/cases/`, {
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

export async function fetchCaseDockets() {
  const res = await fetch(`${API_BASE}/cases/dockets/`, {
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

export async function fetchCaseById(id) {
  const res = await fetch(`${API_BASE}/cases/${id}/`, {
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

export async function createCase(caseData) {
  const res = await fetch(`${API_BASE}/cases/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(caseData),
  })
  return await handleResponse(res)
}

export async function updateCase(id, caseData) {
  const res = await fetch(`${API_BASE}/cases/${id}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(caseData),
  })
  return await handleResponse(res)
}

export async function deleteCase(id) {
  const res = await fetch(`${API_BASE}/cases/${id}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

export async function assignCase(caseId, userId, assignedRole) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/assign/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      user_id: userId,
      assigned_user_id: userId,
      assigned_role: assignedRole,
    }),
  })
  return await handleResponse(res)
}

export async function fetchAssignableOfficers() {
  const res = await fetch(`${API_BASE}/auth/assignable-officers/`, {
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

export async function fetchCaseSummary(id) {
  const res = await fetch(`${API_BASE}/cases/${id}/summary/`, {
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

// -----------------------------------------------------------------------------
// DOCUMENTS (Digital Evidence)
// -----------------------------------------------------------------------------
export async function fetchDocuments(filters = {}) {
  let url = `${API_BASE}/documents/`
  const params = new URLSearchParams()
  if (filters.caseId) params.append('case_id', filters.caseId)
  if (filters.case) params.append('case_id', filters.case)
  if (filters.category && filters.category !== 'All') params.append('category', filters.category)
  if (filters.query) params.append('search', filters.query)
  if (params.toString()) url += `?${params.toString()}`

  const res = await fetch(url, {
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

export async function fetchDocumentById(id) {
  const res = await fetch(`${API_BASE}/documents/${id}/`, {
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

export async function uploadDocument(formData) {
  const res = await fetch(`${API_BASE}/documents/`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: formData,
  })
  return await handleResponse(res)
}

export async function verifyDocumentIntegrity(docId) {
  const res = await fetch(`${API_BASE}/documents/${docId}/verify/`, {
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

export async function signDocument(docId, actionType = 'APPROVE', payload = {}) {
  const res = await fetch(`${API_BASE}/documents/${docId}/action/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      action: actionType,
      challenge_id: payload.challenge_id || 'direct_signature_grant',
      verification_method: payload.verification_method || 'WEBAUTHN',
      verification_proof: payload.verification_proof || 'browser_verified',
      password: payload.password,
    }),
  })
  return await handleResponse(res)
}

export async function updateDocument(docId, data) {
  const res = await fetch(`${API_BASE}/documents/${docId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  return await handleResponse(res)
}

export async function deleteDocument(docId) {
  const res = await fetch(`${API_BASE}/documents/${docId}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

export async function simulateTamper(docId) {
  const res = await fetch(`${API_BASE}/documents/${docId}/simulate-tamper/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

export async function restoreTamper(docId) {
  const res = await fetch(`${API_BASE}/documents/${docId}/restore-tamper/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

// -----------------------------------------------------------------------------
// PHYSICAL EVIDENCE MANAGEMENT
// -----------------------------------------------------------------------------
export async function fetchEvidenceList(params = {}) {
  const query = new URLSearchParams()
  if (params.caseId) query.append('case_id', params.caseId)
  if (params.status && params.status !== 'All') query.append('status', params.status)
  if (params.type && params.type !== 'All') query.append('evidence_type', params.type)
  if (params.search) query.append('search', params.search)

  const url = `${API_BASE}/evidence/${query.toString() ? `?${query.toString()}` : ''}`
  const res = await fetch(url, { headers: getAuthHeaders() })
  return await handleResponse(res)
}

export async function fetchEvidenceById(id) {
  const res = await fetch(`${API_BASE}/evidence/${id}/`, { headers: getAuthHeaders() })
  return await handleResponse(res)
}

export async function createEvidence(evidenceData) {
  const res = await fetch(`${API_BASE}/evidence/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(evidenceData),
  })
  return await handleResponse(res)
}

export async function updateEvidence(id, evidenceData) {
  const res = await fetch(`${API_BASE}/evidence/${id}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(evidenceData),
  })
  return await handleResponse(res)
}

export async function deleteEvidence(id) {
  const res = await fetch(`${API_BASE}/evidence/${id}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

export async function uploadEvidenceMedia(evidenceId, formData) {
  const res = await fetch(`${API_BASE}/evidence/${evidenceId}/media/`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: formData,
  })
  return await handleResponse(res)
}

export async function fetchEvidenceCustody(evidenceId) {
  const res = await fetch(`${API_BASE}/evidence/${evidenceId}/custody/`, {
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}

export async function fetchEvidenceMovements(evidenceId) {
  const res = await fetch(`${API_BASE}/evidence/${evidenceId}/movements/`, {
    headers: getAuthHeaders(),
  })
  return await handleResponse(res)
}


export async function recordConditionChange(evidenceId, conditionData) {
  const res = await fetch(`${API_BASE}/evidence/${evidenceId}/condition-history/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(conditionData),
  })
  return await handleResponse(res)
}

export async function recordSealAction(evidenceId, sealData) {
  const res = await fetch(`${API_BASE}/evidence/${evidenceId}/seal-history/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(sealData),
  })
  return await handleResponse(res)
}

export async function fetchEvidenceStats() {
  const res = await fetch(`${API_BASE}/evidence/stats/`, { headers: getAuthHeaders() })
  return await handleResponse(res)
}

// -----------------------------------------------------------------------------
// STORAGE LOCATIONS & FACILITIES
// -----------------------------------------------------------------------------
export async function fetchFacilities() {
  const res = await fetch(`${API_BASE}/storage/facilities/`, { headers: getAuthHeaders() })
  return await handleResponse(res)
}

export async function fetchStorageLocations(facilityId) {
  let url = `${API_BASE}/storage/locations/`
  if (facilityId) url += `?facility=${facilityId}`
  const res = await fetch(url, { headers: getAuthHeaders() })
  return await handleResponse(res)
}

// -----------------------------------------------------------------------------
// MOVEMENT REQUEST WORKFLOW
// -----------------------------------------------------------------------------
export async function fetchMovementRequests() {
  const res = await fetch(`${API_BASE}/movement-requests/`, { headers: getAuthHeaders() })
  return await handleResponse(res)
}

export async function createMovementRequest(movementData) {
  const res = await fetch(`${API_BASE}/movement-requests/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(movementData),
  })
  return await handleResponse(res)
}

export async function approveMovementRequest(id, notes = '', verificationMethod = 'BIOMETRIC') {
  const res = await fetch(`${API_BASE}/movement-requests/${id}/approve/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ notes, verification_method: verificationMethod }),
  })
  return await handleResponse(res)
}

export async function rejectMovementRequest(id, notes = '', verificationMethod = 'BIOMETRIC') {
  const res = await fetch(`${API_BASE}/movement-requests/${id}/reject/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ notes, verification_method: verificationMethod }),
  })
  return await handleResponse(res)
}

export async function releaseEvidenceMovement(id, payload = {}) {
  const res = await fetch(`${API_BASE}/movement-requests/${id}/release/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  return await handleResponse(res)
}

export async function receiveEvidenceMovement(id, payload = {}) {
  const res = await fetch(`${API_BASE}/movement-requests/${id}/receive/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  return await handleResponse(res)
}

// -----------------------------------------------------------------------------
// AUDIT & ML
// -----------------------------------------------------------------------------
export async function fetchAuditTrail(params = {}) {
  const query = new URLSearchParams(params).toString()
  const res = await fetch(`${API_BASE}/audit/logs/${query ? `?${query}` : ''}`, { headers: getAuthHeaders() })
  return await handleResponse(res)
}

export const fetchAuditLogs = fetchAuditTrail

export async function fetchAnomalies() {
  const res = await fetch(`${API_BASE}/audit/anomalies/`, { headers: getAuthHeaders() })
  return await handleResponse(res)
}

export async function fetchAuditStats() {
  const res = await fetch(`${API_BASE}/audit/stats/`, { headers: getAuthHeaders() })
  return await handleResponse(res)
}

export async function verifyDocumentChain(docId) {
  const res = await fetch(`${API_BASE}/audit/verify-chain/${docId}/`, { headers: getAuthHeaders() })
  return await handleResponse(res)
}

export async function semanticSearch(query) {
  const res = await fetch(`${API_BASE}/ml/search/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ query }),
  })
  return await handleResponse(res)
}

// -----------------------------------------------------------------------------
// WEBAUTHN / PASSKEY BIOMETRICS
// -----------------------------------------------------------------------------
export async function registerPasskey() {
  // Step 1: get options
  const optRes = await fetch(`${API_BASE}/webauthn/register-options/`, { headers: getAuthHeaders() })
  const options = await handleResponse(optRes)
  
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn / Passkeys not supported by this browser.')
  }
  
  // Real WebAuthn create call
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0)),
      rp: options.rp,
      user: {
        id: Uint8Array.from(atob(options.user.id), c => c.charCodeAt(0)),
        name: options.user.name,
        displayName: options.user.displayName,
      },
      pubKeyCredParams: options.pubKeyCredParams,
      authenticatorSelection: options.authenticatorSelection,
      timeout: options.timeout,
    }
  })

  // Step 2: verify
  const verifyRes = await fetch(`${API_BASE}/webauthn/register-verify/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      id: credential.id,
      rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
      type: credential.type,
      response: {
        clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
        attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject))),
      },
    }),
  })
  return await handleResponse(verifyRes)
}
