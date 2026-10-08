import assert from 'node:assert/strict'
import test from 'node:test'
import { dispatchApi } from './plugin.js'

const env = {
  loginToken: 'segredo-local',
  agentId: 'agent_3001m23p224gfzgtyt41nkvwxhjn',
  apiKey: '',
}

test('login accepts the configured token', async () => {
  const ok = await dispatchApi(
    { method: 'POST', pathname: '/api/login', token: '', body: { token: 'segredo-local' } },
    env,
  )
  const denied = await dispatchApi(
    { method: 'POST', pathname: '/api/login', token: '', body: { token: 'outro' } },
    env,
  )
  assert.equal(ok.status, 200)
  assert.equal(denied.status, 401)
})

test('login accepts any listed password and rejects a string that is not one of them', async () => {
  const listed = { ...env, loginToken: 'senha-um:senha-dois' }
  const first = await dispatchApi(
    { method: 'POST', pathname: '/api/login', token: '', body: { token: 'senha-um' } },
    listed,
  )
  const second = await dispatchApi(
    { method: 'POST', pathname: '/api/login', token: '', body: { token: 'senha-dois' } },
    listed,
  )
  const denied = await dispatchApi(
    { method: 'POST', pathname: '/api/login', token: '', body: { token: 'senha-tres' } },
    listed,
  )
  const wholeList = await dispatchApi(
    { method: 'POST', pathname: '/api/login', token: '', body: { token: 'senha-um:senha-dois' } },
    listed,
  )
  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  assert.equal(denied.status, 401)
  assert.equal(wholeList.status, 401)
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
