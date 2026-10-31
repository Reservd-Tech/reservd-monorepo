import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const requestOtp = createServerFn({ method: 'POST' })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email(),
        name: z.string().trim().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { issueCode, OTP_TTL_MINUTES } = await import('./otp.server')
    const issued = await issueCode(data.email)

    const { sendTemplateEmail } = await import('./email-templates/send-email')
    try {
      const result = await sendTemplateEmail('otp-code', data.email, {
        templateData: {
          name: data.name || undefined,
          code: issued.code,
          minutes: OTP_TTL_MINUTES,
        },
      })
      if (!result.sent) {
        return {
          ok: false as const,
          error: "We can't email this address right now. Try a different email address.",
        }
      }
    } catch (error) {
      console.error('[otp] send failed', error)
      return {
        ok: false as const,
        error: "We couldn't send the code right now. Please try again in a moment.",
      }
    }

    return {
      ok: true as const,
      token: issued.token,
      expiresInSeconds: issued.expiresInSeconds,
    }
  })

export const verifyOtp = createServerFn({ method: 'POST' })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email(),
        code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
        token: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { checkCode } = await import('./otp.server')
    const result = await checkCode(data.email, data.code, data.token)
    if (result.ok) {
      const { grantLocationSession } = await import('./location-session.server')
      const { getRequest } = await import('@tanstack/react-start/server')
      const secret = process.env['OTP_SIGNING_SECRET']
      if (secret) await grantLocationSession(secret, new URL(getRequest().url).protocol === 'https:')
      return { ok: true as const }
    }

    const messages: Record<string, string> = {
      no_code: 'That code is no longer valid. Request a new one.',
      expired: 'That code has expired. Request a new one.',
      invalid: 'Incorrect code. Please check and try again.',
    }
    return {
      ok: false as const,
      error: messages[result.reason] ?? 'Incorrect code.',
      requiresNewCode: result.reason !== 'invalid',
    }
  })
