import { existsSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const rootRequire = createRequire(new URL('../package.json', import.meta.url))
const expectedNode = readFileSync(new URL('../.node-version', import.meta.url), 'utf8').trim()
const packageManager = process.env.npm_config_user_agent?.split(' ')[0] ?? 'unknown'
console.info(`[build-deps] Node ${process.versions.node}; package manager ${packageManager}`)
if (process.versions.node !== expectedNode) {
  console.warn(`[build-deps] Expected Node ${expectedNode}; check NODE_VERSION in the build environment.`)
}

const chains = [
  ['better-auth', '@better-fetch/fetch'],
  ['reka-ui', '@floating-ui/vue', '@floating-ui/dom'],
  ['reka-ui', '@floating-ui/vue', '@floating-ui/utils/dom'],
]

function checkDependencies() {
  let failed = false
  for (const chain of chains) {
    let resolveFrom = rootRequire
    try {
      for (const name of chain) {
        const entry = resolveFrom.resolve(name)
        if (!existsSync(entry)) throw new Error(`Resolved entry does not exist: ${entry}`)
        resolveFrom = createRequire(entry)
      }
      console.info(`[build-deps] OK ${chain.join(' -> ')}`)
    }
    catch (error) {
      failed = true
      console.error(`[build-deps] FAILED ${chain.join(' -> ')}: ${error.message}`)
    }
  }
  return !failed
}

if (!checkDependencies()) {
  console.warn('[build-deps] Rebuilding node_modules once with the frozen lockfile to repair missing package links.')
  const projectRoot = fileURLToPath(new URL('..', import.meta.url))
  rmSync(join(projectRoot, 'node_modules'), { recursive: true, force: true })
  const install = spawnSync('pnpm', ['install', '--frozen-lockfile'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, CI: 'true' },
  })
  if (install.error) console.error(`[build-deps] Reinstall failed: ${install.error.message}`)
  if (install.status !== 0 || !checkDependencies()) {
    console.error('[build-deps] Dependency checks still fail. Clear the Cloudflare build cache and inspect the installation log before retrying.')
    process.exitCode = 1
  }
}
