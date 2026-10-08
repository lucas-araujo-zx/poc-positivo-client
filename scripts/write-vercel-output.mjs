import { cp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const output = join(root, '.vercel/output')
const funcDir = join(output, 'functions/api/login.func')

await rm(output, { recursive: true, force: true })
await mkdir(funcDir, { recursive: true })
await cp(join(root, 'dist'), join(output, 'static'), { recursive: true })
await cp(join(root, 'server/vercel-handler.js'), join(funcDir, 'index.js'))
await cp(join(root, 'server/plugin.js'), join(funcDir, 'plugin.js'))
await cp(join(root, 'server/auth.js'), join(funcDir, 'auth.js'))
await writeFile(join(funcDir, 'package.json'), `${JSON.stringify({ type: 'module' }, null, 2)}\n`)
await writeFile(
  join(funcDir, '.vc-config.json'),
  `${JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.js',
      launcherType: 'Nodejs',
      shouldAddHelpers: true,
      maxDuration: 60,
    },
    null,
    2,
  )}\n`,
)

const signed = join(output, 'functions/api/signed-url.func')
await mkdir(dirname(signed), { recursive: true })
await symlink(relative(dirname(signed), funcDir), signed)

await writeFile(
  join(output, 'config.json'),
  `${JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '^/api(?:/.*)?$', dest: '/api/login' },
        { handle: 'filesystem' },
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  )}\n`,
)
