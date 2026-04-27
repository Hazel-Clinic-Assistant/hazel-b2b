import twilio from 'twilio'

const getClient = () =>
  twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)

// env var already contains the full "whatsapp:+..." value
const FROM = process.env.TWILIO_WHATSAPP_FROM!

export async function sendWhatsAppConfirmation(
  to: string,
  patientName: string,
  clinicName: string,
  clinicAddress: string,
  slot: string,
  bookingId: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const intakeLink = `${appUrl}/intake?bookingId=${bookingId}`
  const passportLink = `${appUrl}/passport?bookingId=${bookingId}`

  const slotLine = slot ? `📅 ${slot}\n` : ''
  const addressLine = clinicAddress ? `📍 ${clinicAddress}\n` : ''

  const body = `Hi${patientName ? ` ${patientName}` : ''}! 🌿

Great news — your booking at ${clinicName} has been received and we're looking forward to seeing you.

${slotLine}${addressLine}
Before your visit, please take a few minutes to complete your skin intake form:
${intakeLink}

You can also link your hazel skin passport so your clinician has your full history ready:
${passportLink}

Reply anytime if you have questions — I'm here to help.

— hazel`

  await getClient().messages.create({
    from: FROM,
    to: `whatsapp:${to}`,
    body,
  })
}

export async function sendWhatsAppSlotFollowUp(
  to: string,
  patientName: string,
  skinConcern: string
) {
  // Generate the next four weekday slots from today
  const doctors = ['Dr. Nikita Desai', 'Dr. Aamer Khan', 'Dr. Nikita Desai', 'Dr. Aamer Khan']
  const times = ['10:00am', '2:00pm', '11:00am', '3:00pm']
  const slots: string[] = []
  const d = new Date()
  let found = 0
  while (found < 4) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow === 0 || dow === 6) continue // skip weekends
    const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    slots.push(`• ${label}, ${times[found]} — ${doctors[found]}`)
    found++
  }

  const concernLine = skinConcern ? ` about your ${skinConcern}` : ''
  const name = patientName ? ` ${patientName}` : ''

  const body = `Hi${name}! 🌿 Thanks for chatting with hazel.

No worries about not locking in a slot on the call — here are our next available appointments at Harley Street Skin Clinic${concernLine}:

${slots.join('\n')}

Just reply with the one that suits you and I'll get it confirmed straight away. Or call us directly on 0207 436 4441.

— hazel`

  await getClient().messages.create({
    from: FROM,
    to: `whatsapp:${to}`,
    body,
  })
}

export async function sendWhatsAppCompanionInvite(to: string, patientName: string) {
  const name = patientName ? ` ${patientName}` : ''

  const body = `Hi${name}! 🌿 Your hazel companion is now linked to your appointment.

To start tracking your skin and share your full history with your clinician, open hazel here:

https://hazelskincoach.vercel.app/patient/onboarding

— hazel`

  await getClient().messages.create({
    from: FROM,
    to: `whatsapp:${to}`,
    body,
  })
}

export async function sendWhatsAppReminder(
  to: string,
  patientName: string,
  clinicName: string,
  slot: string
) {
  const body = `Hi ${patientName}! 🌿

Just a gentle reminder — your appointment at ${clinicName} is tomorrow.

📅 ${slot}

We look forward to seeing you.

— hazel`

  await getClient().messages.create({
    from: FROM,
    to: `whatsapp:${to}`,
    body,
  })
}
