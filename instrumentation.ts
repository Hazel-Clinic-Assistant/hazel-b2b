export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error: bookingsErr } = await supabase
    .from('bookings')
    .select('passport_linked')
    .limit(0)

  if (bookingsErr) {
    console.warn(
      '[Hazel] bookings.passport_linked column may be missing.\n' +
      'Run: ALTER TABLE bookings ADD COLUMN IF NOT EXISTS passport_linked boolean DEFAULT false'
    )
  }

  const { error: intakeErr } = await supabase
    .from('intake_submissions')
    .select('passport_email, passport_derm_report')
    .limit(0)

  if (intakeErr) {
    console.warn(
      '[Hazel] intake_submissions columns may be missing.\n' +
      'Run: ALTER TABLE intake_submissions ADD COLUMN IF NOT EXISTS passport_email text, ' +
      'ADD COLUMN IF NOT EXISTS passport_derm_report text'
    )
  }
}
