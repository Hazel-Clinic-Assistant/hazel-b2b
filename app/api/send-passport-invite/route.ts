import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  const { booking_id } = await request.json()

  if (!booking_id) {
    return NextResponse.json({ ok: false, error: 'booking_id required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, clinics(name)')
    .eq('id', booking_id)
    .single()

  if (error || !booking) {
    return NextResponse.json({ ok: false, error: 'Booking not found' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const passportLink = `${appUrl}/passport?bookingId=${booking_id}`
  const clinicName = (booking as { clinics?: { name?: string } }).clinics?.name ?? booking.clinic_id

  const body = `Hi ${booking.patient_name}! 🌿

You've booked an appointment at ${clinicName} — a Hazel-powered clinic.

With Hazel Passport, your clinician can automatically access your skin history, progress photos, and Derm report — no extra forms needed.

Activate your Passport here:
${passportLink}

Don't have a Hazel account yet? Start tracking your skin in 2 minutes at ${process.env.NEXT_PUBLIC_SKIN_COACH_URL}

— Hazel`

  const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
  const from = process.env.TWILIO_WHATSAPP_FROM!

  try {
    await client.messages.create({
      from,
      to: `whatsapp:${booking.phone}`,
      body,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[send-passport-invite] Twilio error', err)
    return NextResponse.json({ ok: false, error: 'Failed to send message' }, { status: 500 })
  }
}
