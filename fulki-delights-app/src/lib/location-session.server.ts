import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
const COOKIE = 'reservd-location-session'
export const LOCATION_SESSION_SECONDS = 7 * 24 * 60 * 60
async function key(secret: string) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}
export async function createLocationToken(secret: string, now = Date.now()) {
  const body = String(now + LOCATION_SESSION_SECONDS * 1000)
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), new TextEncoder().encode('location-session:' + body)))
  return body + '.' + Array.from(signature, b => b.toString(16).padStart(2, '0')).join('')
}
export async function validLocationToken(token: string | undefined, secret: string, now = Date.now()) {
  if (!token) return false
  const [body, signature, extra] = token.split('.')
  if (!body || !signature || extra || !/^\d+$/.test(body) || !/^[a-f0-9]{64}$/.test(signature)) return false
  const expiry = Number(body)
  if (expiry <= now || expiry > now + LOCATION_SESSION_SECONDS * 1000) return false
  const bytes = Uint8Array.from(signature.match(/.{2}/g) ?? [], x => parseInt(x, 16))
  return crypto.subtle.verify('HMAC', await key(secret), bytes, new TextEncoder().encode('location-session:' + body))
}
export async function grantLocationSession(secret: string, secure: boolean) {
  setCookie(COOKIE, await createLocationToken(secret), { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: LOCATION_SESSION_SECONDS })
}
export async function hasLocationSession(secret: string) { return validLocationToken(getCookie(COOKIE), secret) }
export function clearLocationSession() { deleteCookie(COOKIE, { path: '/' }) }
