import { useEffect, useState } from 'react'
import { primeModels } from './isolate.js'
import { getMic, requestMicFromGesture, subscribeMic, watchMic } from './mic.js'

const COPY = {
  needed: {
    title: 'Permitir microfone',
    body: 'A conversa por voz só começa depois desta autorização. Este botão fica aqui até você permitir.',
  },
  quiet: {
    title: 'Permitir microfone',
    body: 'O aviso pode ter ficado só no ícone de microfone, na barra de endereço. No Edge, clique nesse ícone e escolha Permitir.',
  },
  pending: {
    title: 'Aguardando o navegador',
    body: 'Se a janela não abrir, no Edge clique no ícone de microfone ao lado do endereço e escolha Permitir.',
  },
  denied: {
    title: 'Microfone bloqueado',
    body: 'Clique no cadeado ao lado do endereço, abra Permissões e marque Microfone como Permitir. Depois clique aqui de novo.',
  },
  insecure: {
    title: 'Página sem proteção',
    body: 'O microfone só funciona em https ou em localhost. Abra o endereço seguro para autorizar.',
  },
  unsupported: {
    title: 'Navegador sem microfone',
    body: 'Este navegador não libera o microfone. Use Edge, Chrome ou Firefox atualizado.',
  },
  missing: {
    title: 'Nenhum microfone encontrado',
    body: 'Conecte um microfone neste computador e clique aqui de novo.',
  },
  failed: {
    title: 'Não foi possível pedir o microfone',
    body: 'Clique de novo. No Edge, confira o ícone de microfone na barra de endereço.',
  },
}

export function useMic() {
  const [mic, setMic] = useState(getMic)

  useEffect(() => {
    const unsubscribe = subscribeMic(setMic)
    watchMic()
    setMic(getMic())
    return unsubscribe
  }, [])

  useEffect(() => {
    if (mic.status === 'granted') {
      primeModels()
    }
  }, [mic.status])

  return mic
}

export function MicGate({ variant = 'light', id }) {
  const mic = useMic()
  const [pending, setPending] = useState(false)

  if (mic.status === 'checking' || mic.status === 'granted') {
    return null
  }

  const copy = COPY[pending ? 'pending' : mic.detail] || COPY.needed
  const retryLocked = mic.detail === 'insecure' || mic.detail === 'unsupported'

  function allow(event) {
    event.preventDefault()
    if (pending || retryLocked) {
      return
    }
    setPending(true)
    const pendingRequest = requestMicFromGesture()
    Promise.resolve(pendingRequest).finally(() => setPending(false))
  }

  return (
    <button
      id={id}
      type="button"
      className={`mic-gate ${variant}${pending ? ' is-pending' : ''}`}
      onClick={allow}
      disabled={pending || retryLocked}
    >
      <i aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="6" y="1.5" width="4" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4 7.5a4 4 0 0 0 8 0M8 11.5V14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </i>
      <span>
        <strong>{copy.title}</strong>
        <small>{copy.body}</small>
      </span>
    </button>
  )
}
