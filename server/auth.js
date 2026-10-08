import { timingSafeEqual } from 'node:crypto'

const AGENT_ID = /^[a-zA-Z0-9_-]{8,128}$/

function passwordSegments(raw) {
  return String(raw ?? '')
    .split(':')
    .filter((segment) => segment.length > 0)
}

export function tokensMatch(given, expected) {
  const left = Buffer.from(String(given ?? ''))
  const segments = passwordSegments(expected)
  if (!left.length || segments.length === 0) {
    return false
  }

  let matched = false
  for (const segment of segments) {
    const right = Buffer.from(segment)
    if (left.length !== right.length) {
      continue
    }
    matched = timingSafeEqual(left, right) || matched
  }
  return matched
}

export function agentIdFrom(raw) {
  const id = String(raw ?? '').trim()
  return AGENT_ID.test(id) ? id : ''
}
