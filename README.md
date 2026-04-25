# Hazel — AI Receptionist for Skin Clinics

Hazel is a B2B SaaS product for private UK skin clinics. It has two connected surfaces:

- **Hazel Receptionist** — clinic-facing booking and intake system (this repo)
- **Hazel Companion** — patient-facing skin tracking app at [hazelskincoach.vercel.app](https://hazelskincoach.vercel.app)

---

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (database + realtime + storage)
- Vapi (`@vapi-ai/web`) for voice AI
- Twilio for WhatsApp messaging
- Vercel (deploy + cron)

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_VAPI_PUBLIC_KEY=       # Vapi dashboard → API Keys → Public Key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=     # Vapi dashboard → Assistants → your assistant ID

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=+14155238886  # Your Twilio WhatsApp-enabled number

NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

SKIN_COACH_WEBHOOK_SECRET=         # Shared secret for the /api/skin-coach-sync endpoint
```

---

## Vapi Assistant Configuration

### System Prompt

```
You are Hazel, a warm and professional AI receptionist for a private UK skin clinic. Your job is to book appointments for patients.

Ask the patient for:
1. Their full name
2. Their primary skin concern (e.g. acne, pigmentation, rosacea, anti-ageing)
3. How urgent they feel the concern is (low, medium, or high)
4. Their preferred appointment slot (date and time)
5. Their phone number (including country code)

Be warm, calm, and reassuring. Do not give medical advice. Confirm the details back to the patient before ending the call.
```

### Structured Data Schema

Configure this in the Vapi assistant under **Analysis → Structured Data**:

```json
{
  "type": "object",
  "properties": {
    "patient_name": { "type": "string", "description": "Patient's full name" },
    "skin_concern": { "type": "string", "description": "Primary skin concern" },
    "urgency": { "type": "string", "enum": ["low", "medium", "high"], "description": "Urgency level" },
    "preferred_slot": { "type": "string", "description": "Preferred appointment slot" },
    "phone": { "type": "string", "description": "Patient's phone number with country code" }
  },
  "required": ["patient_name", "skin_concern", "urgency", "preferred_slot", "phone"]
}
```

### Webhook URL

Set the **Server URL** in Vapi to:

```
https://your-app.vercel.app/api/vapi-webhook
```

### Clinic Metadata

To associate calls with a specific clinic, set call metadata in Vapi:

```json
{ "clinicId": "demo-clinic" }
```

---

## The Passport Flow

Hazel Passport bridges the Receptionist and the Companion app, letting patients share their tracked skin data with their clinician automatically.

### How it works

1. **Booking created** — after a Vapi call ends, a booking row is inserted with `passport_linked = false`.
2. **WhatsApp confirmation sent** — includes the intake form link and a Passport activation link.
3. **Patient activates Passport** — at `/passport?bookingId=...`, the patient enters their Hazel Companion email. This sets `bookings.passport_linked = true` and writes `passport_email` to `intake_submissions`.
4. **Clinician sees linked status** — on the dashboard, rows with `passport_linked = true` show a green leaf icon and a banner indicating the patient's history is available.
5. **Companion syncs data** — when the Hazel Companion app processes the activation, it POSTs the patient's Derm report to `/api/skin-coach-sync`. The report is stored in `intake_submissions.passport_derm_report` and displayed in the dashboard.

### Key database fields

| Table | Column | Purpose |
|-------|--------|---------|
| `bookings` | `passport_linked` | `true` once patient activates Passport |
| `intake_submissions` | `passport_email` | Patient's Hazel Companion email |
| `intake_submissions` | `passport_derm_report` | Synced Derm report text from Companion |

---

## skin-coach-sync Webhook

The `/api/skin-coach-sync` endpoint receives a POST from the Hazel Companion app when a patient's Derm report is ready.

**Authentication:** Bearer token in the `Authorization` header, matching `SKIN_COACH_WEBHOOK_SECRET`.

**Request body:**

```json
{
  "passport_email": "patient@email.com",
  "booking_id": "uuid-of-booking",
  "derm_report": "Full text of the patient's Derm report..."
}
```

**Response:**

```json
{ "ok": true }
```

---

## Future Integration — Companion to Receptionist

When the Hazel Companion app at [hazelskincoach.vercel.app](https://hazelskincoach.vercel.app) is ready to sync, it should:

1. Detect when a patient has activated their Passport (by looking for their email in an activations table or via a Supabase trigger).
2. Fetch or generate their Derm report.
3. POST to `NEXT_PUBLIC_APP_URL/api/skin-coach-sync` with the body above, using the shared `SKIN_COACH_WEBHOOK_SECRET` as a Bearer token.

The Receptionist will store the Derm report and surface it immediately to the clinician in the dashboard.

---

## Required Database Migrations

If these columns do not exist yet, run them in the Supabase SQL editor:

```sql
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS passport_linked boolean DEFAULT false;

ALTER TABLE intake_submissions
  ADD COLUMN IF NOT EXISTS passport_email text,
  ADD COLUMN IF NOT EXISTS passport_derm_report text;
```

---

## Supabase Storage

Create a public storage bucket called **`intake-photos`** in Supabase. Photos are stored at the path `{clinic_id}/{booking_id}/{filename}`.

---

## Cron Job

`vercel.json` schedules `/api/send-reminders` to run at **9:00 AM UTC daily**. It sends WhatsApp reminder messages to all patients with `whatsapp_status = 'sent'`.

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Demo landing page with Vapi call button and live bookings table |
| `/intake?bookingId=` | 6-step patient intake form |
| `/passport?bookingId=` | Passport activation page |
| `/dashboard?clinic=demo-clinic` | Clinic dashboard |
| `POST /api/vapi-webhook` | Receives Vapi end-of-call reports |
| `POST /api/send-passport-invite` | Sends Passport invite via WhatsApp |
| `GET /api/send-reminders` | Sends 24h reminders (cron) |
| `POST /api/skin-coach-sync` | Receives Derm report from Companion |
