import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendWhatsAppConfirmation } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  const { bookingId } = await request.json()

  if (!bookingId) {
    return NextResponse.json({ ok: false, error: 'bookingId required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, clinics(name, address)')
    .eq('id', bookingId)
    .single()

  if (error || !booking) {
    return NextResponse.json({ ok: false, error: 'Booking not found' }, { status: 404 })
  }

  const clinicName = (booking as { clinics?: { name?: string } }).clinics?.name ?? booking.clinic_id
  const clinicAddress = (booking as { clinics?: { address?: string } }).clinics?.address ?? ''

  try {
    await sendWhatsAppConfirmation(
      booking.phone,
      booking.patient_name,
      clinicName,
      clinicAddress,
      booking.preferred_slot ?? '',
      bookingId
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[resend-intake] Twilio error', err)
    return NextResponse.json({ ok: false, error: 'Failed to send message' }, { status: 500 })
  }
}
