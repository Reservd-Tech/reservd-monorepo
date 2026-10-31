import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const searchLocations = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ query: z.string().trim().min(3).max(160), bias: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).nullable() }).parse(input))
  .handler(async ({ data }) => {
    const { hasLocationSession } = await import('./location-session.server')
    const secret = process.env['OTP_SIGNING_SECRET']
    if (!secret || !await hasLocationSession(secret)) return { places: [], error: 'Sign out from Profile and sign in again to enable address search.', requiresSignIn: true }
    const apiKey = process.env['GOOGLE_MAPS_API_KEY']
    const lovableKey = process.env['LOVABLE_API_KEY']
    if (!apiKey || !lovableKey) return { places: [], error: 'Address search is temporarily unavailable. You can still use device location.', requiresSignIn: false }
    try {
      const response = await fetch('https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText', {
        method: 'POST', headers: { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': apiKey, 'Content-Type': 'application/json', 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location' },
        body: JSON.stringify({ textQuery: data.query, pageSize: 5, ...(data.bias ? { locationBias: { circle: { center: data.bias, radius: 50000 } } } : { regionCode: 'IN' }) }), signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) {
        const body = await response.text()
        console.error(`[location] Google Maps failed [${response.status}]: ${body}`)
        if (response.status === 403) {
          const reason = body.includes('API_KEY_HTTP_REFERRER_BLOCKED') ? 'Google Maps server key is referrer-restricted; set server application restrictions to None or IP addresses.' : body.includes('API_KEY_SERVICE_BLOCKED') ? 'Enable Places API (New) on the Google Maps server key.' : 'Check Google Maps server key restrictions.'
          console.error('[location]', reason)
        }
        return { places: [], error: 'Address search is unavailable right now. Try again later or use device location.', requiresSignIn: false }
      }
      const parsed = z.object({ places: z.array(z.object({ id: z.string(), displayName: z.object({ text: z.string() }), formattedAddress: z.string().optional(), location: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }) })).optional() }).parse(await response.json())
      return { places: (parsed.places ?? []).map(p => ({ id: p.id, name: p.displayName.text, address: p.formattedAddress ?? '', coords: p.location })), error: null, requiresSignIn: false }
    } catch (e) { console.error('[location] search failed', e); return { places: [], error: 'Could not find that location. Please try again.', requiresSignIn: false } }
  })
export const endLocationSession = createServerFn({ method: 'POST' }).handler(async () => {
  const { clearLocationSession } = await import('./location-session.server')
  clearLocationSession()
  return { ok: true }
})
