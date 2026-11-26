import type { H3Event } from 'h3'

// better-auth's own endpoints bypass the requireOrg* helpers — the organization
// plugin reads permission off the member table, the admin plugin off user.role —
// so the host-binding collar in getUserSession never sees them. This guards them
// for sessions nobody verified: portal SSO and guest.
//
// Unrecognised endpoints are refused, not allowed: better-auth adds routes in
// minor bumps, and a new one must not become reachable on its own.

const GLOBAL_IDENTITY_ENDPOINTS = new Set([
  'set-password',
  'change-password',
  'change-email',
  'update-user',
  'delete-user',
  'link-social',
  'unlink-account',
])

function localAuthRequired(): Error {
  return createError({
    statusCode: 403,
    message: 'Sign in directly to perform this action',
    data: { code: 'LOCAL_AUTH_REQUIRED' },
  })
}

// Percent-encoding, `.`/`..` dot-segments or empty (`//`) segments in an
// /api/auth path desync this guard's segment from better-auth's router.
const AUTH_PATH_TRICKERY = /%|(^|\/)\.\.?(\/|$)|\/\//

// Returns true when the caller must answer as if nobody were signed in.
export async function guardSsoAuthRequest(event: H3Event, request: Request): Promise<boolean> {
  // event.path keeps dot-segments the URL parser strips; pathname keeps the
  // encoding it leaves. Route on pathname (as better-auth does) and reject
  // either form's trickery, so neither can hide a guarded endpoint.
  const pathname = new URL(request.url).pathname
  if (!pathname.startsWith('/api/auth/')) return false

  const rawPath = (event.path.split('?')[0] ?? '').slice('/api/auth'.length)
  const normPath = pathname.slice('/api/auth'.length)
  if (AUTH_PATH_TRICKERY.test(rawPath) || AUTH_PATH_TRICKERY.test(normPath)) {
    throw createError({ statusCode: 400, message: 'Malformed auth request path' })
  }

  const rest = pathname.slice('/api/auth/'.length)

  const isOrganization = rest.startsWith('organization/')
  const isAdmin = rest.startsWith('admin/')
  const isOAuthProvider = rest.startsWith('oauth2/')
  const segment = rest.split(/[?/]/)[0] ?? ''
  const isGlobalIdentity = GLOBAL_IDENTITY_ENDPOINTS.has(segment)
  const isGetSession = segment === 'get-session'

  // Resolve the session only for paths that can be refused, so sign-in and
  // callbacks keep their current cost.
  if (!isOrganization && !isAdmin && !isOAuthProvider && !isGlobalIdentity && !isGetSession) return false

  const session = await auth.api.getSession({ headers: event.headers })
  const ssoOrgId = (session?.session as { ssoOrgId?: string | null } | undefined)?.ssoOrgId
  const isGuest = !!(session?.user as { isAnonymous?: boolean | null } | undefined)?.isAnonymous
  if (!ssoOrgId && !isGuest) return false

  // Business endpoints already refuse a session on a host it wasn't issued for,
  // but this route skips the collar and would still hand back name and email.
  if (isGetSession) {
    return !!ssoOrgId && ssoOrgId !== event.context.orgId
  }

  if (isGuest) {
    throw createError({
      statusCode: 403,
      message: 'This session cannot manage credentials, profile, or organization',
    })
  }

  // Portal SSO establishes an end-user identity only. It cannot call any
  // Better Auth organization, admin, OAuth-provider, or global identity route,
  // even when the asserted email belongs to an existing staff account.
  throw localAuthRequired()
}
