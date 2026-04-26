import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendWhatsAppReminder } from '@/lib/twilio'

export async function GET() {
  const supabase = createServerClient()

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, patient_name, phone, preferred_slot, clinic_id, clinics(name)')
    .eq('whatsapp_status', 'sent')

  if (error) {
    console.error('[send-reminders] query error', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  let count = 0
  for (const booking of bookings ?? []) {
    try {
      const clinicName =
        (booking as { clinics?: { name?: string } }).clinics?.name ?? booking.clinic_id
      await sendWhatsAppReminder(
        booking.phone,
        booking.patient_name,
        clinicName,
        booking.preferred_slot
      )
      await supabase
        .from('bookings')
        .update({ whatsapp_status: 'reminder_sent' })
        .eq('id', booking.id)
      count++
    } catch (err) {
      console.error(`[send-reminders] failed for booking ${booking.id}`, err)
    }
  }

  return NextResponse.json({ ok: true, count })
}
