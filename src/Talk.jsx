import { Conversation } from '@elevenlabs/client'
import { useEffect, useRef, useState } from 'react'
import logo from '../positivo-logo.png'
import { signedUrl } from './api.js'
import { markAgentSpeaking, onIsolationMode, releaseIsolation, warmAudio } from './isolate.js'
import { MicGate, useMic } from './MicGate.jsx'
import { Orb } from './Orb.jsx'

function roleOf(message) {
  return message?.source === 'user' || message?.role === 'user' ? 'user' : 'agent'
}

export function Talk({ token, name, onSignOut }) {
  const [mode, setMode] = useState('voice')
  const [status, setStatus] = useState('idle')
  const [agentMode, setAgentMode] = useState('listening')
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [directMic, setDirectMic] = useState(false)
  const sessionRef = useRef(null)
  const listRef = useRef(null)
  const mic = useMic()
  const voiceReady = mic.status === 'granted'

  useEffect(() => {
    const list = listRef.current
    if (list) {
      list.scrollTop = list.scrollHeight
    }
  }, [messages, mode, status])

  useEffect(() => onIsolationMode(setDirectMic), [])

  useEffect(() => () => {
    sessionRef.current?.endSession?.().catch(() => {})
    sessionRef.current = null
    releaseIsolation()
  }, [])

  function pushMessage(role, text) {
    const next = text?.trim()
    if (!next) {
      return
    }
    setMessages((current) => {
      const last = current[current.length - 1]
      if (last && last.role === role && last.text === next) {
        return current
      }
      return [...current, { id: crypto.randomUUID(), role, text: next }]
    })
  }

  async function stop() {
    const current = sessionRef.current
    sessionRef.current = null
    setStatus('idle')
    setAgentMode('listening')
    try {
      await current?.endSession?.()
    } catch {
      // A sessão já pode ter caído.
    }
    releaseIsolation()
    setDirectMic(false)
  }

  async function start(nextMode, opening) {
    if (nextMode !== 'text' && !voiceReady) {
      return
    }
    if (nextMode !== 'text') {
      warmAudio()
    }
    setError('')
    setDirectMic(false)
    setStatus('connecting')
    setMessages([])
    try {
      const session = await signedUrl(token)
      const conversation = await Conversation.startSession({
        signedUrl: session.signedUrl,
        connectionType: 'websocket',
        textOnly: nextMode === 'text',
        dynamicVariables: { user_name: name },
        onConnect: () => setStatus('connected'),
        onDisconnect: () => {
          sessionRef.current = null
          setAgentMode('listening')
          setStatus((current) => (current === 'connected' ? 'ended' : 'idle'))
        },
        onModeChange: ({ mode: next }) => {
          const speaking = next === 'speaking'
          setAgentMode(speaking ? 'speaking' : 'listening')
          markAgentSpeaking(speaking)
        },
        onMessage: (message) => pushMessage(roleOf(message), message?.message),
        onError: (message) => {
          const text = typeof message === 'string' ? message : 'Não foi possível manter a conversa.'
          setError(text)
        },
      })
      sessionRef.current = conversation
      setStatus('connected')
      if (opening) {
        pushMessage('user', opening)
        conversation.sendUserMessage(opening)
      }
    } catch (reason) {
      releaseIsolation()
      setDirectMic(false)
      setStatus('idle')
      setError(reason instanceof Error ? reason.message : 'Não foi possível abrir a conversa.')
    }
  }

  async function switchMode() {
    const next = mode === 'voice' ? 'text' : 'voice'
    if (status !== 'idle') {
      await stop()
    }
    setMessages([])
    setDraft('')
    setError('')
    setMode(next)
  }

  async function send(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || status === 'connecting') {
      return
    }
    if (mode === 'voice' && !voiceReady && !sessionRef.current) {
      setError('Autorize o microfone para falar. Para escrever agora, use Conversar por texto.')
      return
    }
    setDraft('')
    if (!sessionRef.current) {
      await start(mode, text)
      return
    }
    pushMessage('user', text)
    sessionRef.current.sendUserMessage(text)
  }

  const live = status === 'connected' || status === 'connecting'

  return (
    <div className={`talk ${mode}`}>
      <header className="talk-top">
        <div className="talk-brand">
          <img src={logo} alt="Positivo Tecnologia" />
          <p className="talk-user">{name}</p>
        </div>
        <div className="talk-actions">
          <button type="button" className="quiet" onClick={onSignOut}>
            Sair
          </button>
          <button type="button" className="mode-switch" onClick={switchMode}>
            {mode === 'voice' ? 'Conversar por texto' : 'Falar por voz'}
          </button>
        </div>
      </header>

      <main className="talk-stage">
        <MicGate id="mic-gate-hint" variant="dark" />
        <div className={`orb-slot ${agentMode}`}>
          <Orb speaking={agentMode === 'speaking'} listening={live} />
          {mode === 'voice' ? (
            <button
              type="button"
              className={`call-pill ${live ? 'is-live' : ''} ${voiceReady ? '' : 'is-locked'}`}
              disabled={status === 'connecting' || !voiceReady}
              aria-describedby={!voiceReady && mic.status !== 'checking' ? 'mic-gate-hint' : undefined}
              onClick={() => (live ? stop() : start('voice'))}
            >
              <i aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M5.813 2.813v12.375m-3-7.876v3.375M9 5.814v6.375m3.188-7.876v9.375m3-6.374v3.375"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </i>
              <span>
                {status === 'connecting'
                  ? 'Conectando...'
                  : live
                    ? 'Encerrar'
                    : 'Iniciar'}
              </span>
            </button>
          ) : null}
        </div>

        {mode === 'voice' && live ? (
          <p className="talk-status">{agentMode === 'speaking' ? 'Falando' : 'Ouvindo'}</p>
        ) : null}
        {mode === 'voice' && live && directMic ? (
          <p className="talk-note">A voz está passando direto. O isolador não entrou nesta chamada.</p>
        ) : null}

        <section className="chat" aria-live="polite">
          <ol className="messages" ref={listRef}>
            {messages.length === 0 ? (
              <li className="empty">
                <p>
                  {status === 'connecting'
                    ? 'Conectando...'
                    : mode === 'voice' && !voiceReady
                      ? 'Autorize o microfone para falar com a MIA. O texto continua disponível.'
                      : mode === 'voice'
                        ? 'Fale pelo microfone ou escreva aqui.'
                        : 'Escreva para o agente.'}
                </p>
              </li>
            ) : (
              messages.map((item) => (
                <li key={item.id} className={`bubble ${item.role}`}>
                  <span>{item.role === 'user' ? 'Você' : 'Agente'}</span>
                  <p>{item.text}</p>
                </li>
              ))
            )}
          </ol>
          <form className="composer" onSubmit={send}>
            <input
              value={draft}
              placeholder="Escreva uma mensagem"
              disabled={status === 'connecting'}
              onChange={(event) => setDraft(event.target.value)}
            />
            {live ? (
              <button type="button" className="end-chat" onClick={stop}>
                Encerrar
              </button>
            ) : null}
            <button type="submit" className="send" aria-label="Enviar" disabled={status === 'connecting' || !draft.trim()}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </section>

        {error ? (
          <p className="talk-error" role="alert">
            {error}
          </p>
        ) : null}
      </main>
    </div>
  )
}
