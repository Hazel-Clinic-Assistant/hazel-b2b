import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { buildSystemPrompt, DEFAULT_CLINIC, type ClinicData } from '@/lib/clinic-prompt'
import { sendWhatsAppConfirmation } from '@/lib/twilio'

type Message = { role: string; content: string }

function parseClinicRef(body: string): { cleanBody: string; clinicId: string | null } {
  const match = body.match(/\[ref:([a-z0-9_-]+)\]/i)
  if (!match) return { cleanBody: body, clinicId: null }
  return {
    cleanBody: body.replace(match[0], '').replace(/\s{2,}/g, ' ').trim(),
    clinicId: match[1],
  }
}

async function getClinicData(clinicId: string): Promise<ClinicData> {
  if (!clinicId || clinicId === 'demo-clinic') return DEFAULT_CLINIC
  try {
    const supabase = createServerClient()
    const { data: fileData, error } = await supabase.storage
      .from('intake-photos')
      .download(`_configs/${clinicId}.json`)
    if (error || !fileData) throw new Error(error?.message ?? 'no file')
    const json = await fileData.text()
    const clinic: ClinicData = JSON.parse(json)
    if (clinic.name) return clinic
  } catch (err) {
    console.warn('[whatsapp-inbound] clinic config not found for', clinicId, err)
  }
  return DEFAULT_CLINIC
}

function twiml(msg: string): NextResponse {
  const safe = msg
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  )
}

function wantsCall(text: string): boolean {
  const t = text.toLowerCase().trim()
  return /\b(call me|give me a call|ring me|phone me|call us|call you|i'd like a call|can you call|please call|want a call|get a call)\b/.test(t)
    || t === 'call' || t === '1' || t === 'one'
}

function isConfirmedSlot(slot: string | undefined): boolean {
  if (!slot || !slot.trim()) return false
  if (/^(none|n\/a|not specified|unknown|tbd|null|not confirmed|not booked|no slot|not selected|not chosen)$/i.test(slot.trim())) return false
  return /\b(am|pm|morning|afternoon|evening|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|\d{1,2}(:\d{2})?)\b/i.test(slot)
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const from = formData.get('From')?.toString() ?? ''
  const rawBody = formData.get('Body')?.toString().trim() ?? ''
  const hasMedia = !!formData.get('MediaUrl0')
  const phone = from.replace('whatsapp:', '').trim()

  if (!phone) return twiml('')

  const { cleanBody: body, clinicId: refClinicId } = parseClinicRef(rawBody)

  console.log('[whatsapp-inbound] from:', phone, 'body:', body.slice(0, 60), 'refClinicId:', refClinicId, 'hasMedia:', hasMedia)

  if (!rawBody) {
    return twiml(
      hasMedia
        ? `I can't listen to voice notes just yet — please type your message and I'll get right back to you! 🎤`
        : `I didn't quite catch that — could you type your message for me?`
    )
  }

  const supabase = createServerClient()

  const cutoff = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', phone)
    .gte('updated_at', cutoff)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!session) {
    const resolvedClinicId = refClinicId ?? 'demo-clinic'
    const clinic = await getClinicData(resolvedClinicId)

    const greeting = `Hi! 👋 I'm hazel, the AI receptionist for ${clinic.name}.

I can answer your questions about treatments, or get you booked in with one of the team.

Would you prefer:
📞 *A call from hazel* — I'll ring you within 30 seconds
💬 *Chat here* — I'll help you over WhatsApp

Just reply *call* or start chatting!`

    await supabase.from('whatsapp_sessions').insert({
      phone,
      clinic_id: resolvedClinicId,
      messages: [
        { role: 'user', content: body || rawBody },
        { role: 'assistant', content: greeting },
      ],
      state: 'greeting',
    })
    return twiml(greeting)
  }

  if (refClinicId && refClinicId !== session.clinic_id) {
    await supabase
      .from('whatsapp_sessions')
      .update({ clinic_id: refClinicId, updated_at: new Date().toISOString() })
      .eq('id', session.id)
    session.clinic_id = refClinicId
  }

  const messages: Message[] = [...(session.messages ?? []), { role: 'user', content: body || rawBody }]

  if (wantsCall(body)) {
    let chatName = ''
    let chatSkinConcern = ''
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (anthropicKey && messages.length > 1) {
      try {
        const transcript = messages
          .map((m) => `${m.role === 'user' ? 'Patient' : 'Hazel'}: ${m.content}`)
          .join('\n')
        const extractRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 60,
            system: 'Extract the patient\'s name and skin concern from this WhatsApp chat. Reply ONLY with valid JSON, nothing else: {"name":"","skin_concern":""}. Use empty string if not mentioned.',
            messages: [{ role: 'user', content: transcript }],
          }),
        })
        const extractData = await extractRes.json()
        const parsed = JSON.parse(extractData.content?.[0]?.text ?? '{}')
        chatName = parsed.name ?? ''
        chatSkinConcern = parsed.skin_concern ?? ''
      } catch {
        // best-effort
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    fetch(`${appUrl}/api/request-callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        clinicId: session.clinic_id ?? 'demo-clinic',
        name: chatName || undefined,
        skinConcern: chatSkinConcern || undefined,
      }),
    }).catch((err) => console.error('[whatsapp-inbound] callback error', err))

    const reply = `Perfect — I'll call you within 30 seconds! Just pick up when you see our number. 📞`
    const updated = [...messages, { role: 'assistant', content: reply }]

    await supabase
      .from('whatsapp_sessions')
      .update({ messages: updated, state: 'call_triggered', updated_at: new Date().toISOString() })
      .eq('id', session.id)

    return twiml(reply)
  }

  // Load clinic data once — used for both the system prompt and booking confirmation
  const clinicData = await getClinicData(session.clinic_id ?? 'demo-clinic')
  const systemPrompt = buildSystemPrompt(clinicData)
  let reply = `Thanks for your message. For immediate help please get in touch with the clinic directly.`

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    console.error('[whatsapp-inbound] ANTHROPIC_API_KEY not set')
  } else {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: systemPrompt,
          messages: messages
            .filter((m) => m.content?.trim())
            .slice(-12)
            .map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error('[whatsapp-inbound] Anthropic error', res.status, JSON.stringify(data))
      } else {
        reply = data.content?.[0]?.text ?? reply
        console.log('[whatsapp-inbound] AI reply length:', reply.length)
      }
    } catch (err) {
      console.error('[whatsapp-inbound] Anthropic fetch error', err)
    }
  }

  const updated = [...messages, { role: 'assistant', content: reply }]
  const newState = session.state === 'booking_confirmed' ? 'booking_confirmed' : 'chatting'

  await supabase
    .from('whatsapp_sessions')
    .update({ messages: updated, state: newState, updated_at: new Date().toISOString() })
    .eq('id', session.id)

  // After hazel replies, check if a booking was just confirmed in the chat.
  // Only run when we have enough context and haven't already created a booking.
  if (session.state !== 'booking_confirmed' && anthropicKey && updated.length >= 4) {
    try {
      const transcript = updated
        .map((m) => `${m.role === 'user' ? 'Patient' : 'Hazel'}: ${m.content}`)
        .join('\n')

      const extractRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 120,
          system: 'Extract booking info from this WhatsApp chat. Reply ONLY with valid JSON: {"has_confirmed_booking":false,"patient_name":"","skin_concern":"","urgency":"low","preferred_slot":""}. Set has_confirmed_booking=true ONLY if hazel has explicitly confirmed a booking with a specific date or time.',
          messages: [{ role: 'user', content: transcript }],
        }),
      })

      const extractData = await extractRes.json()
      const extracted = JSON.parse(extractData.content?.[0]?.text ?? '{}')

      if (extracted.has_confirmed_booking && isConfirmedSlot(extracted.preferred_slot)) {
        console.log('[whatsapp-inbound] booking detected via chat for', extracted.patient_name, '|', extracted.preferred_slot)

        const { data: booking, error: bookingErr } = await supabase
          .from('bookings')
          .insert({
            clinic_id: session.clinic_id ?? 'demo-clinic',
            patient_name: extracted.patient_name ?? '',
            skin_concern: extracted.skin_concern ?? '',
            urgency: extracted.urgency ?? 'low',
            preferred_slot: extracted.preferred_slot,
            phone,
            whatsapp_status: 'pending',
            intake_complete: false,
            passport_linked: false,
          })
          .select()
          .single()

        if (!bookingErr && booking) {
          try {
            await sendWhatsAppConfirmation(
              phone,
              extracted.patient_name ?? '',
              clinicData.name,
              clinicData.address ?? '',
              extracted.preferred_slot,
              booking.id
            )
            await supabase.from('bookings').update({ whatsapp_status: 'sent' }).eq('id', booking.id)
          } catch (err) {
            console.error('[whatsapp-inbound] intake invite send error', err)
          }

          await supabase
            .from('whatsapp_sessions')
            .update({ state: 'booking_confirmed', updated_at: new Date().toISOString() })
            .eq('id', session.id)

          console.log('[whatsapp-inbound] booking created + intake form sent, id:', booking.id)
        }
      }
    } catch (err) {
      console.warn('[whatsapp-inbound] booking detection failed:', err)
    }
  }

  return twiml(reply)
}
