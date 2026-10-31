import { describe, it as test } from 'node:test'
import assert from 'node:assert/strict'
import { createLocationToken, validLocationToken, LOCATION_SESSION_SECONDS } from './location-session.server'
describe('verified location access', () => {
  const secret = 'test-only-signing-material-never-used-in-app'
  const now = 1800000000000
  test('only a valid signed cookie authorizes location search', async () => {
    const token = await createLocationToken(secret, now)
    assert.equal(await validLocationToken(token, secret, now), true)
    assert.equal(await validLocationToken(undefined, secret, now), false)
    assert.equal(await validLocationToken(token, 'different-signing-key', now), false)
    assert.equal(await validLocationToken(token + '.extra', secret, now), false)
  })
  test('expires after seven days and rejects modified expiry', async () => {
    const token = await createLocationToken(secret, now)
    assert.equal(await validLocationToken(token, secret, now + LOCATION_SESSION_SECONDS * 1000), false)
    assert.equal(await validLocationToken(token.replace(/^\d+/, String(now + 1234)), secret, now), false)
  })
})
