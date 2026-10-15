import { useState } from 'react'
import { clearSession, login, readSession, writeSession } from './api.js'
import { Login } from './Login.jsx'
import { Talk } from './Talk.jsx'

export function App() {
  const [session, setSession] = useState(readSession)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  async function handleLogin(next) {
    setLoginLoading(true)
    setLoginError('')
    try {
      const result = await login(next)
      if (!result?.name) {
        throw new Error('Não foi possível identificar o acesso.')
      }
      const value = { token: next, name: result.name }
      writeSession(value)
      setSession(value)
    } catch (error) {
      setLoginError(error.message)
    } finally {
      setLoginLoading(false)
    }
  }

  function signOut() {
    clearSession()
    setSession(null)
  }

  if (!session) {
    return <Login error={loginError} loading={loginLoading} onSubmit={handleLogin} />
  }

  return <Talk token={session.token} name={session.name} onSignOut={signOut} />
}
