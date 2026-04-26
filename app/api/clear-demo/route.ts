import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST() {
  const supabase = createServerClient()

  // Delete submissions first (foreign key on booking_id)
  await supabase
    .from('intake_submissions')
    .delete()
    .eq('clinic_id', 'demo-clinic')

  await supabase
    .from('bookings')
    .delete()
    .eq('clinic_id', 'demo-clinic')

  return NextResponse.json({ ok: true })
}
