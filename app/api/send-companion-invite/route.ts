import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendWhatsAppCompanionInvite } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  const { bookingId } = await request.json()

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select('phone, patient_name')
    .eq('id', bookingId)
    .single()

  if (!booking?.phone) {
    return NextResponse.json({ ok: false, error: 'No phone on booking' })
  }

  try {
    await sendWhatsAppCompanionInvite(booking.phone, booking.patient_name ?? '')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[send-companion-invite]', err)
    return NextResponse.json({ ok: false, error: 'Failed to send' }, { status: 500 })
  }
}
