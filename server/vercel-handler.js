import { dispatchApi, requestTarget } from './plugin.js'

function headerValue(req, name) {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()]
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

async function jsonBody(req) {
  const body = req.body
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    return body
  }
  if (typeof body === 'string') {
    return body.trim() ? JSON.parse(body) : {}
  }
  if (Buffer.isBuffer(body)) {
    const raw = body.toString('utf8')
    return raw.trim() ? JSON.parse(raw) : {}
  }
  if ((req.method ?? 'GET').toUpperCase() !== 'POST') {
    return undefined
  }
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw.trim() ? JSON.parse(raw) : {}
}

export default async function handler(req, res) {
  try {
    const url = requestTarget(req)
    const result = await dispatchApi(
      {
        method: req.method ?? 'GET',
        pathname: url.pathname,
        token: headerValue(req, 'x-positivo-token'),
        body: await jsonBody(req),
      },
      {
        users: process.env.POSITIVO_USERS ?? '',
        agentId: process.env.POSITIVO_AGENT_ID ?? '',
        apiKey: process.env.ELEVENLABS_API_KEY ?? '',
      },
    )
    res.status(result?.status ?? 404).json(result?.payload ?? { error: 'Não encontrado.' })
  } catch {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Falha interna.' })
    }
  }
}
