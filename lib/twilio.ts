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

  const slotLine = slot ? `📅 ${slot}\n` : ''
  const addressLine = clinicAddress ? `📍 ${clinicAddress}\n` : ''

  const body = `Hi${patientName ? ` ${patientName}` : ''}! 🌿

Great news — your booking at ${clinicName} has been received and we're looking forward to seeing you.

${slotLine}${addressLine}
Before your visit, please take a few minutes to complete your skin intake form:
${intakeLink}

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
  skinConcern: string,
  bookingId: string,
  clinicName: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const intakeLink = `${appUrl}/intake?bookingId=${bookingId}`

  const concernLine = skinConcern ? ` about your ${skinConcern}` : ''
  const name = patientName ? ` ${patientName}` : ''

  const body = `Hi${name}! 🌿 Thanks for chatting with hazel.

No worries about not locking in a slot on the call — the team at ${clinicName} will be in touch to confirm your appointment${concernLine}.

In the meantime, please complete your skin intake form so your clinician is prepared:
${intakeLink}

Reply anytime if you have questions.

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
  const body = `Hi${patientName ? ` ${patientName}` : ''}! 🌿

Just a gentle reminder — your appointment at ${clinicName || 'the clinic'} is tomorrow.${slot ? `\n\n📅 ${slot}` : ''}

We look forward to seeing you.

— hazel`

  await getClient().messages.create({
    from: FROM,
    to: `whatsapp:${to}`,
    body,
  })
}
