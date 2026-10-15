import assert from 'node:assert/strict'
import test from 'node:test'
import { dispatchApi } from './plugin.js'

const env = {
  users: JSON.stringify([
    { name: 'Maria Silva', password: 'segredo-local' },
    { name: 'João Costa', password: 'senha-dois' },
  ]),
  agentId: 'agent_3001m23p224gfzgtyt41nkvwxhjn',
  apiKey: '',
}

test('login accepts the configured token and returns the user name', async () => {
  const ok = await dispatchApi(
    { method: 'POST', pathname: '/api/login', token: '', body: { token: 'segredo-local' } },
    env,
  )
  const second = await dispatchApi(
    { method: 'POST', pathname: '/api/login', token: '', body: { token: 'senha-dois' } },
    env,
  )
  const denied = await dispatchApi(
    { method: 'POST', pathname: '/api/login', token: '', body: { token: 'outro' } },
    env,
  )
  assert.equal(ok.status, 200)
  assert.deepEqual(ok.payload, { ok: true, name: 'Maria Silva' })
  assert.deepEqual(second.payload, { ok: true, name: 'João Costa' })
  assert.equal(denied.status, 401)
})

test('login rejects a string that is not one of the passwords', async () => {
  const wholeList = await dispatchApi(
    { method: 'POST', pathname: '/api/login', token: '', body: { token: env.users } },
    env,
  )
  const missing = await dispatchApi(
    { method: 'POST', pathname: '/api/login', token: '', body: { token: 'senha-um' } },
    { ...env, users: '' },
  )
  assert.equal(wholeList.status, 401)
  assert.equal(missing.status, 503)
})

test('signed url stays behind the login token and the ElevenLabs key', async () => {
  const denied = await dispatchApi(
    { method: 'GET', pathname: '/api/signed-url', token: 'outro' },
    env,
  )
  const missingKey = await dispatchApi(
    { method: 'GET', pathname: '/api/signed-url', token: 'segredo-local' },
    env,
  )
  assert.equal(denied.status, 401)
  assert.equal(missingKey.status, 503)
  assert.match(missingKey.payload.error, /ElevenLabs/)
})
