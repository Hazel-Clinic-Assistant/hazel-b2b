import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { name, clinicUrl, email } = await req.json()

  if (!name || !clinicUrl || !email) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { error } = await supabase.from('demo_requests').insert({
    name,
    clinic_url: clinicUrl,
    email,
  })

  if (error) {
    console.error('demo_requests insert error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
