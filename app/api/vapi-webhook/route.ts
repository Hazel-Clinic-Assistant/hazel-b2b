import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendWhatsAppConfirmation } from '@/lib/twilio'

// Only treat a slot as confirmed if it looks like a real time/day, not a hallucinated filler value
const NULL_SLOT_PATTERNS = /^(none|n\/a|not specified|unknown|tbd|null|not confirmed|not booked|no slot|not selected|not chosen)$/i

function isConfirmedSlot(slot: string | undefined): boolean {
  if (!slot || !slot.trim()) return false
  if (NULL_SLOT_PATTERNS.test(slot.trim())) return false
  // Must contain something that looks like a time or day
  return /\b(am|pm|morning|afternoon|evening|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|\d{1,2}(:\d{2})?)\b/i.test(slot)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (body.message?.type !== 'end-of-call-report') {
    return NextResponse.json({ ok: true })
  }

  const structured = body.message.analysis?.structuredData ?? {}
  const { urgency } = structured
  const patient_name: string =
    body.message.call?.metadata?.patient_name || structured.patient_name || ''
  const skin_concern: string =
    structured.skin_concern || body.message.call?.metadata?.skin_concern || ''
  const phone: string = structured.phone || body.message.call?.metadata?.phone || ''
  const clinicId: string = body.message.call?.metadata?.clinicId ?? 'demo-clinic'

  const confirmedSlot = isConfirmedSlot(structured.preferred_slot) ? structured.preferred_slot : null

  console.log('[vapi-webhook] patient:', patient_name, '| slot:', confirmedSlot ?? '(none confirmed)')

  const supabase = createServerClient()

  const { data: clinic } = await supabase
    .from('clinics')
    .select('name, address')
    .eq('id', clinicId)
    .single()

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      clinic_id: clinicId,
      patient_name,
      skin_concern,
      urgency,
      preferred_slot: confirmedSlot,
      phone,
      whatsapp_status: 'pending',
      intake_complete: false,
      passport_linked: false,
    })
    .select()
    .single()

  if (error || !booking) {
    console.error('[vapi-webhook] insert error', error)
    return NextResponse.json({ ok: false, error: error?.message }, { status: 500 })
  }

  // Only send a WhatsApp message if a slot was actually confirmed
  if (confirmedSlot && phone) {
    try {
      await sendWhatsAppConfirmation(
        phone,
        patient_name,
        clinic?.name ?? clinicId,
        clinic?.address ?? '',
        confirmedSlot,
        booking.id
      )
      await supabase
        .from('bookings')
        .update({ whatsapp_status: 'sent' })
        .eq('id', booking.id)
    } catch (err) {
      console.error('[vapi-webhook] WhatsApp send error', err)
    }
  }

  return NextResponse.json({ ok: true, bookingId: booking.id })
}
