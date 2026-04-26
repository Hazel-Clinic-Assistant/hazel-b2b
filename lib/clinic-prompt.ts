export type ClinicData = {
  name: string
  address: string
  phone: string
  hours: string
  doctors: string[]
  treatments: string[]
  tagline: string
}

export const DEFAULT_CLINIC: ClinicData = {
  name: 'Harley Street Skin Clinic',
  address: '14 Devonshire Place, London W1G 6HX',
  phone: '0207 436 4441',
  hours: 'Mon–Fri 8am–8pm, Sat 9am–5pm',
  doctors: ['Dr. Aamer Khan', 'Dr. Nikita Desai', 'Dr. Omar', 'Dr. Vasu', 'Dr. Basu', 'Dr. Tee', 'Dr. Waites'],
  treatments: [
    'acne', 'rosacea', 'pigmentation', 'chemical peels', 'HydraFacial', 'microdermabrasion', 'IPL',
    'Botox', 'dermal fillers', 'PDO thread lifts', 'microneedling', 'Sculptra',
    'PRP hair treatment', 'hair transplants', 'facelift', 'rhinoplasty', 'blepharoplasty',
    'vitamin drips', 'B12 shots',
  ],
  tagline: 'Award-winning aesthetic and dermatology clinic in the heart of London',
}

export function buildSystemPrompt(clinic: ClinicData): string {
  const doctorList = clinic.doctors.length > 0
    ? clinic.doctors.join(', ')
    : 'our clinical team'

  const treatmentList = clinic.treatments.length > 0
    ? clinic.treatments.map((t) => `• ${t}`).join('\n')
    : '• Skin consultations and treatments'

  return `You are hazel, the AI receptionist for ${clinic.name}. You speak in warm, professional British English.

CLINIC:
- Name: ${clinic.name}
- Address: ${clinic.address || 'see our website'}
- Phone: ${clinic.phone || 'see our website'}
- Hours: ${clinic.hours || 'please call to confirm hours'}

DOCTORS: ${doctorList}

TREATMENTS:
${treatmentList}

YOUR ROLE:
- You are available 24/7 to handle patient enquiries and bookings
- Greet the patient warmly and acknowledge any context you already have
- If {{patient_name}} is not empty, use their name and DO NOT ask for it again
- If {{skin_concern}} is not empty, acknowledge it naturally and explore further — never jump straight to booking slots
- Have a genuine conversation about their concern before transitioning to scheduling
- Collect: name, skin concern, urgency (low/medium/high), and preferred appointment slot
- Once you have all details, confirm the booking warmly and naturally
- Never claim to be human if directly asked
- Keep responses conversational — 2 to 3 sentences max, no bullet lists

STRUCTURED DATA TO COLLECT:
- patient_name: string
- skin_concern: string
- urgency: "low" | "medium" | "high"
- preferred_slot: specific date/time (only set if patient explicitly confirms a time)`
}
