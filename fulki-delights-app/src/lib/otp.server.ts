// Server-only OTP helpers.
//
// Codes are NOT kept in memory: the server runs on stateless workers, so an
// in-memory map loses the code between the "send" request and the "verify"
// request. Instead we hand the client a signed, opaque ticket that contains the
// email, the hashed code and an expiry. Verification recomputes the signature,
// so any worker can validate any code.

const CODE_TTL_MS = 10 * 60 * 1000

export const OTP_TTL_MINUTES = CODE_TTL_MS / 60000

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function secret() {
  const value = process.env['OTP_SIGNING_SECRET']
  if (!value) throw new Error('OTP_SIGNING_SECRET is not configured')
  return value
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function b64url(value: string) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function unb64url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  return atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)))
}

async function hashCode(email: string, code: string, nonce: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${email}:${code}:${nonce}:${secret()}`),
  )
  return toHex(digest)
}

type Ticket = {
  e: string // email
  h: string // hashed code
  n: string // nonce
  x: number // expiry (epoch ms)
}

export async function issueCode(email: string) {
  const key = normalizeEmail(email)
  const now = Date.now()
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0]! % 1000000).padStart(6, '0')
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(8)).buffer)

  const ticket: Ticket = {
    e: key,
    h: await hashCode(key, code, nonce),
    n: nonce,
    x: now + CODE_TTL_MS,
  }
  const body = b64url(JSON.stringify(ticket))
  const token = `${body}.${await sign(body)}`

  return { ok: true as const, code, token, expiresInSeconds: CODE_TTL_MS / 1000 }
}

type CheckFailure = { ok: false; reason: 'no_code' | 'expired' | 'invalid' }

export async function checkCode(
  email: string,
  code: string,
  token: string,
): Promise<{ ok: true } | CheckFailure> {
  const key = normalizeEmail(email)
  const [body, signature] = token.split('.')
  if (!body || !signature) return { ok: false, reason: 'no_code' }

  const expectedSignature = await sign(body)
  if (
    signature.length !== expectedSignature.length ||
    !signature.split('').every((c, i) => c === expectedSignature[i])
  ) {
    return { ok: false, reason: 'no_code' }
  }

  let ticket: Ticket
  try {
    ticket = JSON.parse(unb64url(body)) as Ticket
  } catch {
    return { ok: false, reason: 'no_code' }
  }

  if (ticket.e !== key) return { ok: false, reason: 'no_code' }
  if (Date.now() > ticket.x) return { ok: false, reason: 'expired' }

  const hash = await hashCode(key, code.trim(), ticket.n)
  if (hash !== ticket.h) return { ok: false, reason: 'invalid' }
  return { ok: true }
}
