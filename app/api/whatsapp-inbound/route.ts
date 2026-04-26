import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { buildSystemPrompt, DEFAULT_CLINIC, type ClinicData } from '@/lib/clinic-prompt'

type Message = { role: string; content: string }

// Parse [ref:CLINIC_ID] from message body, return { cleanBody, clinicId }
function parseClinicRef(body: string): { cleanBody: string; clinicId: string | null } {
  const match = body.match(/\[ref:([a-z0-9_-]+)\]/i)
  if (!match) return { cleanBody: body, clinicId: null }
  return {
    cleanBody: body.replace(match[0], '').replace(/\s{2,}/g, ' ').trim(),
    clinicId: match[1],
  }
}

async function getSystemPrompt(clinicId: string): Promise<string> {
  if (!clinicId || clinicId === 'demo-clinic') return buildSystemPrompt(DEFAULT_CLINIC)
  try {
    const supabase = createServerClient()
    const { data: fileData, error } = await supabase.storage
      .from('intake-photos')
      .download(`_configs/${clinicId}.json`)
    if (error || !fileData) throw new Error(error?.message ?? 'no file')
    const json = await fileData.text()
    const clinic: ClinicData = JSON.parse(json)
    if (clinic.name) return buildSystemPrompt(clinic)
  } catch (err) {
    console.warn('[whatsapp-inbound] clinic config not found for', clinicId, err)
  }
  return buildSystemPrompt(DEFAULT_CLINIC)
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
  // Must explicitly mention a call or phone — avoids triggering on general agreement words
  return /\b(call me|give me a call|ring me|phone me|call us|call you|i'd like a call|can you call|please call|want a call|get a call)\b/.test(t)
    || t === 'call' || t === '1' || t === 'one'
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const from = formData.get('From')?.toString() ?? ''
  const rawBody = formData.get('Body')?.toString().trim() ?? ''
  const hasMedia = !!formData.get('MediaUrl0')
  const phone = from.replace('whatsapp:', '').trim()

  if (!phone) return twiml('')

  // Strip any [ref:CLINIC_ID] marker from the message
  const { cleanBody: body, clinicId: refClinicId } = parseClinicRef(rawBody)

  console.log('[whatsapp-inbound] from:', phone, 'body:', body.slice(0, 60), 'refClinicId:', refClinicId, 'hasMedia:', hasMedia)

  // Voice notes and other media arrive with an empty body
  if (!rawBody) {
    return twiml(
      hasMedia
        ? `I can't listen to voice notes just yet — please type your message and I'll get right back to you! 🎤`
        : `I didn't quite catch that — could you type your message for me?`
    )
  }

  const supabase = createServerClient()

  // Find an active session in the last 8 hours
  const cutoff = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', phone)
    .gte('updated_at', cutoff)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // No active session — greet using the correct clinic
  if (!session) {
    const resolvedClinicId = refClinicId ?? 'demo-clinic'
    const systemPrompt = await getSystemPrompt(resolvedClinicId)

    // Extract clinic name from the prompt for the greeting
    const clinicNameMatch = systemPrompt.match(/AI receptionist for (.+?)\. You/)
    const clinicName = clinicNameMatch?.[1] ?? 'this clinic'

    const greeting = `Hi! 👋 I'm hazel, the AI receptionist for ${clinicName}.

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

  // If the message contains a clinic ref and the session has a different clinic_id, update it
  if (refClinicId && refClinicId !== session.clinic_id) {
    await supabase
      .from('whatsapp_sessions')
      .update({ clinic_id: refClinicId, updated_at: new Date().toISOString() })
      .eq('id', session.id)
    session.clinic_id = refClinicId
  }

  // Append the clean user message (ref stripped) to history
  const messages: Message[] = [...(session.messages ?? []), { role: 'user', content: body || rawBody }]

  // Check for call intent in any state
  if (wantsCall(body)) {
    // Extract name and skin concern from chat history so the call picks up where we left off
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
        // best-effort — proceed without context
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

  // AI chat response — use the clinic that was set when this session started
  const systemPrompt = await getSystemPrompt(session.clinic_id ?? 'demo-clinic')
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
  await supabase
    .from('whatsapp_sessions')
    .update({ messages: updated, state: 'chatting', updated_at: new Date().toISOString() })
    .eq('id', session.id)

  return twiml(reply)
}
