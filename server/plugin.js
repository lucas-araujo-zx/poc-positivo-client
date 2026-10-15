import { agentIdFrom, findUser, parseUsers } from './auth.js'

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function requestUrl(req) {
  return new URL(req.url ?? '/', 'http://localhost')
}

function headerValue(req, name) {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()]
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 4096) {
        reject(new Error('payload'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('json'))
      }
    })
    req.on('error', reject)
  })
}

function authenticate(token, env) {
  const users = parseUsers(env.users)
  if (!users || users.length === 0) {
    return {
      status: 503,
      error: 'O acesso ainda não foi configurado.',
    }
  }
  const user = findUser(users, token)
  if (!user) {
    return { status: 401, error: 'Token inválido.' }
  }
  return { user }
}

async function signedUrl(env) {
  const agentId = agentIdFrom(env.agentId)
  if (!agentId) {
    return { status: 503, payload: { error: 'O agente ainda não foi configurado.' } }
  }
  if (!env.apiKey) {
    return { status: 503, payload: { error: 'A ElevenLabs ainda não foi configurada.' } }
  }
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
    { headers: { 'xi-api-key': env.apiKey } },
  )
  if (response.status === 401) {
    return { status: 401, payload: { error: 'A chave da ElevenLabs foi recusada.' } }
  }
  if (response.status === 404) {
    return { status: 404, payload: { error: 'Não encontrei esse agente na conta da ElevenLabs.' } }
  }
  if (!response.ok) {
    return { status: 502, payload: { error: 'Não foi possível falar com a ElevenLabs.' } }
  }
  const body = await response.json()
  if (typeof body?.signed_url !== 'string' || !body.signed_url) {
    return { status: 502, payload: { error: 'A ElevenLabs não devolveu a sessão.' } }
  }
  return { status: 200, payload: { signedUrl: body.signed_url } }
}

function apiTarget(value, searchParams) {
  if (!value || value.includes('://') || value.includes('..')) {
    return null
  }
  const url = new URL(value, 'http://localhost')
  if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) {
    return null
  }
  searchParams?.forEach((item, key) => {
    if (!url.searchParams.has(key)) {
      url.searchParams.append(key, item)
    }
  })
  return url
}

export function requestTarget(req) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const hinted = apiTarget(headerValue(req, 'x-positivo-path'), url.searchParams)
  const method = (req.method ?? 'GET').toUpperCase()
  const rewritten =
    url.pathname === '/api' ||
    url.pathname === '/api/' ||
    url.pathname.includes('[') ||
    (url.pathname === '/api/login' && method !== 'POST')
  if (!rewritten && url.pathname.startsWith('/api/')) {
    return url
  }
  return hinted ?? url
}

export async function dispatchApi({ method, pathname, token, body }, env) {
  const path = pathname.replace(/\/+$/, '') || '/'

  if (path === '/api/login' && method === 'POST') {
    const result = authenticate(String(body?.token ?? '').trim(), env)
    if (result.status) {
      return { status: result.status, payload: { error: result.error } }
    }
    return { status: 200, payload: { ok: true, name: result.user.name } }
  }

  if (!path.startsWith('/api/')) {
    return null
  }

  if (method !== 'GET' || path !== '/api/signed-url') {
    return { status: path.startsWith('/api/') ? 404 : 405, payload: { error: 'Não encontrado.' } }
  }

  const result = authenticate(token, env)
  if (result.status) {
    return { status: result.status, payload: { error: result.error } }
  }
  return signedUrl(env)
}

export function clientApiPlugin(env) {
  const safe = {
    users: env.users?.trim() ?? '',
    agentId: env.agentId?.trim() ?? '',
    apiKey: env.apiKey?.trim() ?? '',
  }

  const attach = (middlewares) => {
    middlewares.use((req, res, next) => {
      const url = requestUrl(req)
      if (!url.pathname.startsWith('/api/')) {
        next()
        return
      }
      void (async () => {
        const body = req.method === 'POST' ? await readBody(req) : undefined
        return dispatchApi(
          {
            method: req.method ?? 'GET',
            pathname: url.pathname,
            token: headerValue(req, 'x-positivo-token'),
            body,
          },
          safe,
        )
      })()
        .then((result) => {
          if (!result) {
            next()
            return
          }
          json(res, result.status, result.payload)
        })
        .catch((error) => {
          if (!res.headersSent) {
            const invalid = error instanceof Error && (error.message === 'json' || error.message === 'payload')
            json(res, invalid ? 400 : 500, {
              error: invalid ? 'Não consegui ler o token.' : 'Falha interna.',
            })
          }
        })
    })
  }

  return {
    name: 'positivo-client-api',
    configureServer(server) {
      attach(server.middlewares)
    },
    configurePreviewServer(server) {
      attach(server.middlewares)
    },
  }
}
