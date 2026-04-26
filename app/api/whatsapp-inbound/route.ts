import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const SYSTEM_PROMPT = `You are Hazel, the AI receptionist for Harley Street Skin Clinic. You are chatting with a patient via WhatsApp.

CLINIC:
- Address: 14 Devonshire Place, London W1G 6HX (2-min walk from Regent's Park tube)
- Phone: 0207 436 4441
- Hours: Mon–Fri 8am–8pm, Sat 9am–5pm, closed Sunday

DOCTORS: Dr. Aamer Khan (Lead Clinician), Dr. Nikita Desai, Dr. Omar, Dr. Vasu, Dr. Basu, Dr. Tee, Dr. Waites

TREATMENTS:
• Skin: acne, rosacea, pigmentation, acne scar treatment, chemical peels, HydraFacial, microdermabrasion, IPL, photodynamic therapy, mole/skin tag/wart/cyst/milia removal, cherry angioma removal
• Aesthetics: Botox, dermal fillers (lips, cheeks, jawline, tear trough, chin), PDO thread lifts, Silhouette Soft threads, microneedling, Sculptra, Ellansé, mesotherapy
• Hair: PRP hair treatment, hair transplants, scalp micropigmentation
• Surgical: facelift, rhinoplasty, blepharoplasty, liposuction, VASER lipo, breast augmentation/reduction/lift, tummy tuck, BBL, FaceTite, BodyTite, labiaplasty, buccal fat removal
• Wellness: vitamin drips (Myers' cocktail, NAD cocktail), B12 shots, vitamin D shots

PRICING: Not listed publicly — patients should book a consultation or call 0207 436 4441.

COMMUNICATION STYLE:
- Keep messages short and conversational — 2 to 4 sentences max per reply
- Speak in British English with a warm, professional tone
- Natural language is fine; the occasional emoji is welcome
- Never claim to be human if directly asked
- If a patient wants to book, collect their name, skin concern, and preferred appointment time, then confirm warmly`

type Message = { role: string; content: string }

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

const GREETING = `Hi! 👋 I'm Hazel, the AI receptionist for Harley Street Skin Clinic.

I can answer your questions about our treatments, or get you booked in with one of our doctors.

Would you prefer:
📞 *A call from Hazel* — I'll ring you within 30 seconds
💬 *Chat here* — I'll help you over WhatsApp

Just reply *call* or start chatting!`

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const from = formData.get('From')?.toString() ?? ''
  const body = formData.get('Body')?.toString().trim() ?? ''
  const hasMedia = !!formData.get('MediaUrl0')
  const phone = from.replace('whatsapp:', '').trim()

  if (!phone) return twiml('')

  console.log('[whatsapp-inbound] from:', phone, 'body:', body.slice(0, 60), 'hasMedia:', hasMedia)

  // Voice notes and other media arrive with an empty body
  if (!body) {
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

  // No active session — send greeting and wait
  if (!session) {
    await supabase.from('whatsapp_sessions').insert({
      phone,
      clinic_id: 'demo-clinic',
      messages: [
        { role: 'user', content: body },
        { role: 'assistant', content: GREETING },
      ],
      state: 'greeting',
    })
    return twiml(GREETING)
  }

  // Append the user's message
  const messages: Message[] = [...(session.messages ?? []), { role: 'user', content: body }]

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
        clinicId: 'demo-clinic',
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

  // AI chat response
  let reply = `Thanks for your message. For immediate help please call us on 0207 436 4441, or visit us at 14 Devonshire Place, London W1G 6HX.`

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
          system: SYSTEM_PROMPT,
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
