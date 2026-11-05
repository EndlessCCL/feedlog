import { createError, defineEventHandler, getHeader, toWebRequest } from 'h3'
import type { WakeMessage } from '../lib/inbox/scheduler'

// Only the generated private queue entry sets this in-process marker.
// Public HTTP clients cannot turn a forged CloudEvent into a queue callback.
export default defineEventHandler(async event => {
  if (import.meta.preset !== 'vercel' && process.env.VERCEL !== '1') return
  if (getHeader(event, 'ce-type') !== 'com.vercel.queue.v2beta') return
  if (!(event.node.req as unknown as Record<symbol, unknown>)[Symbol.for('feedlog.inbox.queue-consumer')]) {
    throw createError({ statusCode: 403, message: 'Queue callbacks require the private consumer' })
  }
  const [{ handleCallback }, { consumeBackground, INBOX_TOPIC }] = await Promise.all([
    import('@vercel/queue'),
    import('../lib/inbox/platform'),
  ])
  const handler = handleCallback<WakeMessage>(async (message, metadata) => {
    if (metadata.topicName !== INBOX_TOPIC) throw new Error('Unexpected queue topic')
    await consumeBackground({}, message)
  }, { retry: () => ({ afterSeconds: 60 }) })
  return handler(toWebRequest(event))
})
