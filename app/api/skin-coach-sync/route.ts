import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (token !== process.env.SKIN_COACH_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { passport_email, booking_id, derm_report } = await request.json()

  if (!passport_email || !booking_id || !derm_report) {
    return NextResponse.json(
      { ok: false, error: 'passport_email, booking_id, and derm_report are required' },
      { status: 400 }
    )
  }

  const supabase = createServerClient()

  const { error } = await supabase
    .from('intake_submissions')
    .update({ passport_derm_report: derm_report })
    .eq('booking_id', booking_id)

  if (error) {
    console.error('[skin-coach-sync] update error', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
