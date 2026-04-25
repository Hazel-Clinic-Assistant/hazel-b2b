import twilio from 'twilio'

const getClient = () =>
  twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)

const FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`

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

  const body = `Hi ${patientName}! 🌿

Your appointment at ${clinicName} is confirmed.

📅 Slot: ${slot}
📍 ${clinicAddress}

Please complete your skin intake form before your visit — it only takes a few minutes:
${intakeLink}

P.S. Have a Hazel account? Link your skin history so your clinician can see your progress automatically:
${passportLink}

— Hazel`

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

— Hazel`

  await getClient().messages.create({
    from: FROM,
    to: `whatsapp:${to}`,
    body,
  })
}
