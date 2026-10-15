const SESSION_KEY = 'positivo.client.session'
const LEGACY_TOKEN_KEY = 'positivo.client.token'

export function readSession() {
  sessionStorage.removeItem(LEGACY_TOKEN_KEY)
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) {
    return null
  }
  try {
    const data = JSON.parse(raw)
    if (typeof data?.token === 'string' && data.token && typeof data?.name === 'string' && data.name) {
      return { token: data.token, name: data.name }
    }
  } catch {
    return null
  }
  return null
}

export function writeSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    token: session.token,
    name: session.name,
  }))
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(LEGACY_TOKEN_KEY)
}

async function request(path, { method = 'GET', token = '', body } = {}) {
  const headers = { 'x-positivo-path': path }
  if (token) {
    headers['x-positivo-token'] = token
  }
  if (body) {
    headers['Content-Type'] = 'application/json'
  }
  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('application/json')) {
    throw new Error('A API não respondeu JSON.')
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || 'Não foi possível concluir o pedido.')
  }
  return payload
}

export function login(token) {
  return request('/api/login', { method: 'POST', body: { token } })
}

export function signedUrl(token) {
  return request('/api/signed-url', { token })
}
