const listeners = new Set()

let snapshot = { status: 'checking', detail: '' }
let watching = false

export function getMic() {
  return snapshot
}

function setMic(next) {
  snapshot = next
  listeners.forEach((listener) => listener(snapshot))
}

export function subscribeMic(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function applyPermissionState(state) {
  if (state === 'granted') {
    setMic({ status: 'granted', detail: '' })
    return
  }
  if (state === 'denied') {
    setMic({ status: 'denied', detail: 'denied' })
    return
  }
  setMic({ status: 'needed', detail: '' })
}

async function readPermissionState() {
  const query = navigator.permissions?.query
  if (!query) {
    return 'prompt'
  }
  const status = await query.call(navigator.permissions, { name: 'microphone' })
  return status.state
}

export function watchMic() {
  if (watching || typeof window === 'undefined') {
    return
  }
  watching = true

  if (!window.isSecureContext) {
    setMic({ status: 'blocked', detail: 'insecure' })
    return
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setMic({ status: 'blocked', detail: 'unsupported' })
    return
  }

  const query = navigator.permissions?.query
  if (!query) {
    setMic({ status: 'needed', detail: '' })
    return
  }

  query.call(navigator.permissions, { name: 'microphone' }).then(
    (status) => {
      applyPermissionState(status.state)
      status.onchange = () => applyPermissionState(status.state)
    },
    () => setMic({ status: 'needed', detail: '' }),
  )
}

export function requestMicFromGesture() {
  if (typeof window === 'undefined' || !window.isSecureContext) {
    setMic({ status: 'blocked', detail: 'insecure' })
    return Promise.resolve(snapshot)
  }

  const devices = navigator.mediaDevices
  if (!devices?.getUserMedia) {
    setMic({ status: 'blocked', detail: 'unsupported' })
    return Promise.resolve(snapshot)
  }

  return devices.getUserMedia({ audio: true }).then(
    (stream) => {
      stream.getTracks().forEach((track) => track.stop())
      setMic({ status: 'granted', detail: '' })
      return snapshot
    },
    (error) => {
      const name = error?.name || ''
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setMic({ status: 'blocked', detail: 'missing' })
        return snapshot
      }
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        return readPermissionState().then(
          (state) => {
            if (state === 'denied') {
              setMic({ status: 'denied', detail: 'denied' })
            } else {
              setMic({ status: 'needed', detail: 'quiet' })
            }
            return snapshot
          },
          () => {
            setMic({ status: 'needed', detail: 'quiet' })
            return snapshot
          },
        )
      }
      setMic({ status: 'needed', detail: 'failed' })
      return snapshot
    },
  )
}
