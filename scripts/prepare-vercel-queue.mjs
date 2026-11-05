import { cp, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Nitro emits one public Node function. Give queue delivery its own private
// function, with an explicit consumer group required by the Build Output API.
const functionsDir = resolve('.vercel/output/functions')
const source = resolve(functionsDir, '__fallback.func')
const target = resolve(functionsDir, '__inbox_queue.func')
const config = JSON.parse(await readFile(resolve(source, '.vc-config.json'), 'utf8'))
if (config.handler !== 'index.mjs' || !config.runtime.startsWith('nodejs')) {
  throw new Error('Unexpected Nitro Vercel function layout')
}
if (config.experimentalTriggers?.length) {
  throw new Error('The public Nitro function must not have queue triggers')
}
await rm(target, { recursive: true, force: true })
await cp(source, target, { recursive: true, dereference: true })
await writeFile(resolve(target, 'queue-entry.mjs'), `import handler from './index.mjs'
export default function (req, res) {
  req[Symbol.for('feedlog.inbox.queue-consumer')] = true
  return handler(req, res)
}
`)
await writeFile(resolve(target, '.vc-config.json'), JSON.stringify({
  ...config,
  handler: 'queue-entry.mjs',
  experimentalTriggers: [{
    type: 'queue/v2beta',
    topic: 'feedlog-inbox',
    consumer: 'feedlog-inbox',
    retryAfterSeconds: 60,
  }],
}, null, 2) + '\n')
console.log('[vercel] Prepared private Inbox queue consumer; public SSR function has no triggers')
