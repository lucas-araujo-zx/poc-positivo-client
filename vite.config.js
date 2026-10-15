import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { clientApiPlugin } from './server/plugin.js'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '')
  return {
    plugins: [
      react(),
      clientApiPlugin({
        users: env.POSITIVO_USERS,
        agentId: env.POSITIVO_AGENT_ID,
        apiKey: env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY || '',
      }),
    ],
    envPrefix: 'PUBLIC_',
    server: {
      port: 5175,
      strictPort: true,
    },
    preview: {
      port: 5175,
      strictPort: true,
    },
  }
})
