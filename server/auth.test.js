import assert from 'node:assert/strict'
import test from 'node:test'
import { agentIdFrom, findUser, parseUsers } from './auth.js'

const users = [
  { name: 'Maria Silva', password: 'senha-um' },
  { name: 'João Costa', password: 'senha-dois' },
]

test('parseUsers reads name and password and rejects a broken list', () => {
  assert.deepEqual(parseUsers(JSON.stringify(users)), users)
  assert.deepEqual(parseUsers(''), [])
  assert.equal(parseUsers('nao-json'), null)
  assert.equal(parseUsers('{"name":"Maria"}'), null)
  assert.equal(
    parseUsers(JSON.stringify([{ name: 'Maria Silva', password: 'senha-um' }, { name: 'Outra', password: 'senha-um' }])),
    null,
  )
  assert.equal(parseUsers(JSON.stringify([{ name: ' ', password: 'senha-um' }])), null)
})

test('findUser returns the person for that password', () => {
  assert.deepEqual(findUser(users, 'senha-um'), users[0])
  assert.deepEqual(findUser(users, 'senha-dois'), users[1])
  assert.equal(findUser(users, 'senha-tres'), null)
  assert.equal(findUser(users, ''), null)
  assert.equal(findUser([], 'senha-um'), null)
})

test('agentIdFrom keeps a single agent id', () => {
  assert.equal(agentIdFrom('agent_3001m23p224gfzgtyt41nkvwxhjn'), 'agent_3001m23p224gfzgtyt41nkvwxhjn')
  assert.equal(agentIdFrom('  '), '')
  assert.equal(agentIdFrom('nome:agent_3001m23p224gfzgtyt41nkvwxhjn'), '')
})
