import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendWhatsAppConfirmation } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (body.message?.type !== 'end-of-call-report') {
    return NextResponse.json({ ok: true })
  }

  const structured = body.message.analysis?.structuredData ?? {}
  const { patient_name, skin_concern, urgency, preferred_slot, phone } = structured
  const clinicId: string = body.message.call?.metadata?.clinicId ?? 'demo-clinic'

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
      preferred_slot,
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

  try {
    await sendWhatsAppConfirmation(
      phone,
      patient_name,
      clinic?.name ?? clinicId,
      clinic?.address ?? '',
      preferred_slot,
      booking.id
    )

    await supabase
      .from('bookings')
      .update({ whatsapp_status: 'sent' })
      .eq('id', booking.id)
  } catch (err) {
    console.error('[vapi-webhook] WhatsApp send error', err)
  }

  return NextResponse.json({ ok: true, bookingId: booking.id })
}
