import { useState } from 'react'
import { clearToken, login, readToken, writeToken } from './api.js'
import { Login } from './Login.jsx'
import { Talk } from './Talk.jsx'

export function App() {
  const [token, setToken] = useState(readToken)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  async function handleLogin(next) {
    setLoginLoading(true)
    setLoginError('')
    try {
      await login(next)
      writeToken(next)
      setToken(next)
    } catch (error) {
      setLoginError(error.message)
    } finally {
      setLoginLoading(false)
    }
  }

  function signOut() {
    clearToken()
    setToken('')
  }

  if (!token) {
    return <Login error={loginError} loading={loginLoading} onSubmit={handleLogin} />
  }

  return <Talk token={token} onSignOut={signOut} />
}
