import assert from 'node:assert/strict'
import test from 'node:test'
import { isElevenLabsCapture } from './isolate.js'

test('the ElevenLabs capture is recognized by voiceIsolation', () => {
  assert.equal(isElevenLabsCapture({ audio: { voiceIsolation: true, echoCancellation: true } }), true)
})

test('the permission prompt and the isolator microphone stay on the raw device', () => {
  assert.equal(isElevenLabsCapture({ audio: true }), false)
  assert.equal(isElevenLabsCapture(undefined), false)
  assert.equal(
    isElevenLabsCapture({
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
        voiceIsolation: false,
        channelCount: 1,
      },
    }),
    false,
  )
})
