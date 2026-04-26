import { NextRequest, NextResponse } from 'next/server'
import { buildSystemPrompt, type ClinicData } from '@/lib/clinic-prompt'

export async function POST(request: NextRequest) {
  const { phone, name, skinConcern, clinicId, clinicData } = await request.json()

  if (!phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 })
  }

  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID
  if (!phoneNumberId) {
    return NextResponse.json({ error: 'VAPI_PHONE_NUMBER_ID not configured' }, { status: 500 })
  }

  const firstName = name?.trim().split(' ')[0] ?? ''
  const clinic = clinicData as ClinicData | undefined
  const clinicName = clinic?.name ?? 'Harley Street Skin Clinic'

  console.log('[request-callback] name:', firstName || '(none)', '| clinic:', clinicName, '| skinConcern:', skinConcern || '(none)')

  // Open naturally — acknowledge what we know, invite them to share more.
  let firstMessage: string
  if (firstName && skinConcern) {
    firstMessage = `Hi ${firstName}! It's hazel calling from ${clinicName}. I saw you were curious about ${skinConcern} — I'd love to hear a bit more about what you're hoping for.`
  } else if (firstName) {
    firstMessage = `Hi ${firstName}! It's hazel calling from ${clinicName}. What brings you in today?`
  } else {
    firstMessage = `Hi! It's hazel calling from ${clinicName}. Could I start by getting your name?`
  }

  const assistantOverrides: Record<string, unknown> = {
    firstMessage,
    variableValues: {
      patient_name: name ?? '',
      skin_concern: skinConcern ?? '',
    },
  }

  // If a custom clinic was provided, override the system prompt
  if (clinic?.name) {
    assistantOverrides.model = {
      messages: [{ role: 'system', content: buildSystemPrompt(clinic) }],
    }
  }

  const res = await fetch('https://api.vapi.ai/call/phone', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assistantId: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID,
      phoneNumberId,
      customer: { number: phone, name: name ?? undefined },
      assistantOverrides,
      metadata: {
        clinicId: clinicId ?? 'demo-clinic',
        phone,
        patient_name: name ?? '',
        skin_concern: skinConcern ?? '',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[request-callback] Vapi error', err)
    return NextResponse.json({ error: 'Failed to initiate call' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
