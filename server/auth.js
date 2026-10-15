import { timingSafeEqual } from 'node:crypto'

const AGENT_ID = /^[a-zA-Z0-9_-]{8,128}$/

function sameSecret(given, expected) {
  const left = Buffer.from(String(given ?? ''))
  const right = Buffer.from(String(expected ?? ''))
  if (!left.length || left.length !== right.length) {
    return false
  }
  return timingSafeEqual(left, right)
}

export function parseUsers(raw) {
  const text = String(raw ?? '').trim()
  if (!text) {
    return []
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (!Array.isArray(data)) {
    return null
  }

  const users = []
  const seen = new Set()
  for (const item of data) {
    if (!item || typeof item !== 'object') {
      return null
    }
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    const password = typeof item.password === 'string' ? item.password.trim() : ''
    if (!name || !password || seen.has(password)) {
      return null
    }
    seen.add(password)
    users.push({ name, password })
  }
  return users
}

export function findUser(users, given) {
  if (!Array.isArray(users) || users.length === 0) {
    return null
  }

  let found = null
  for (const user of users) {
    if (!sameSecret(given, user.password)) {
      continue
    }
    if (found) {
      return null
    }
    found = user
  }
  return found
}

export function agentIdFrom(raw) {
  const id = String(raw ?? '').trim()
  return AGENT_ID.test(id) ? id : ''
}
