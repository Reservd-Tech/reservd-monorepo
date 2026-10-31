import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  code?: string
  minutes?: number
}

const Email = ({ name, code = '000000', minutes = 10 }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${code} is your Reservd verification code`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>RESERVD</Text>
        <Heading style={heading}>Verify your email</Heading>
        <Text style={text}>
          {name ? `Hi ${name},` : 'Hi there,'} use the code below to finish setting up your Reservd
          account.
        </Text>
        <Section style={codeBox}>
          <Text style={codeText}>{code}</Text>
        </Section>
        <Text style={muted}>
          This code expires in {minutes} minutes. If you didn't request it, you can safely ignore
          this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your Reservd verification code',
  displayName: 'OTP verification code',
  previewData: { name: 'Jerin', code: '481923', minutes: 10 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '520px' }
const brand = {
  fontSize: '12px',
  letterSpacing: '3px',
  fontWeight: 700,
  color: '#f97316',
  margin: '0 0 12px',
}
const heading = { fontSize: '24px', color: '#111827', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '24px' }
const codeBox = {
  backgroundColor: '#fff7ed',
  borderRadius: '14px',
  padding: '18px',
  textAlign: 'center' as const,
  margin: '24px 0',
}
const codeText = {
  fontSize: '34px',
  fontWeight: 700,
  letterSpacing: '10px',
  color: '#c2410c',
  margin: '0',
}
const muted = { fontSize: '13px', color: '#6b7280', lineHeight: '20px' }
