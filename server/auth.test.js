import assert from 'node:assert/strict'
import test from 'node:test'
import { agentIdFrom, tokensMatch } from './auth.js'

test('tokensMatch accepts the same secret and rejects a different one', () => {
  assert.equal(tokensMatch('segredo-local', 'segredo-local'), true)
  assert.equal(tokensMatch('segredo-local', 'outro-segredo'), false)
  assert.equal(tokensMatch('curto', 'segredo-local'), false)
})

test('tokensMatch accepts any colon-separated password and rejects the rest', () => {
  const list = 'senha-um:senha-dois:senha-tres'
  assert.equal(tokensMatch('senha-um', list), true)
  assert.equal(tokensMatch('senha-dois', list), true)
  assert.equal(tokensMatch('senha-tres', list), true)
  assert.equal(tokensMatch('senha-quatro', list), false)
  assert.equal(tokensMatch('senha-um:senha-dois', list), false)
  assert.equal(tokensMatch('senha-um', ':senha-um::senha-dois:'), true)
  assert.equal(tokensMatch('', ':senha-um:'), false)
})

test('agentIdFrom keeps a single agent id', () => {
  assert.equal(agentIdFrom('agent_3001m23p224gfzgtyt41nkvwxhjn'), 'agent_3001m23p224gfzgtyt41nkvwxhjn')
  assert.equal(agentIdFrom('  '), '')
  assert.equal(agentIdFrom('nome:agent_3001m23p224gfzgtyt41nkvwxhjn'), '')
})
