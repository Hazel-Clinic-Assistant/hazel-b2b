import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const secret = process.env.CLEAR_DEMO_SECRET
  if (secret) {
    const auth = request.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

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
