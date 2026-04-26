import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, patientName } = await request.json()

  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[send-companion-email] RESEND_API_KEY not configured — skipping email')
    return NextResponse.json({ ok: false, error: 'email not configured' })
  }

  const from = process.env.RESEND_FROM_EMAIL ?? 'hazel <onboarding@resend.dev>'
  const signupUrl = process.env.NEXT_PUBLIC_SKIN_COACH_URL ?? 'https://hazelskincoach.vercel.app/patient/onboarding'
  const firstName = patientName?.split(' ')[0] ?? 'there'

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F8EDE6;font-family:Georgia,serif;">
  <div style="max-width:520px;margin:0 auto;padding:48px 32px;background:#F8EDE6;color:#292524;">

    <p style="font-size:26px;font-weight:700;margin:0 0 4px;">hazel</p>
    <p style="font-size:13px;color:#79716b;margin:0 0 40px;letter-spacing:0.05em;">your skin companion</p>

    <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">Hi ${firstName},</p>

    <p style="font-size:15px;line-height:1.7;color:#44403b;margin:0 0 12px;">
      Your clinician has invited you to link your hazel companion account.
    </p>
    <p style="font-size:15px;line-height:1.7;color:#44403b;margin:0 0 32px;">
      Once connected, your skin history, progress photos, and Derm report will appear on their dashboard automatically — no extra forms or paperwork at your appointment.
    </p>

    <a href="${signupUrl}"
       style="display:inline-block;background:#292524;color:#EDD5C8;text-decoration:none;padding:14px 28px;border-radius:100px;font-size:14px;font-weight:500;letter-spacing:0.01em;">
      Set up your hazel account →
    </a>

    <p style="font-size:13px;color:#79716b;line-height:1.6;margin:32px 0 0;">
      Takes about 2 minutes. You'll be asked to log your skin type, any concerns, and optionally upload a few photos — the same information you just completed in your intake form.
    </p>

    <hr style="border:none;border-top:1px solid #EDD5C8;margin:40px 0 24px;"/>

    <p style="font-size:12px;color:#a09590;margin:0;line-height:1.6;">
      hazel · AI receptionist for skin clinics<br/>
      If you weren't expecting this email, you can safely ignore it.
    </p>
  </div>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Set up your hazel companion account',
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[send-companion-email] Resend error', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
