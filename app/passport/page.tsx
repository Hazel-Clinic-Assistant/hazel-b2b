'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { NavHeader } from '@/app/components/NavHeader'

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-4 h-4'}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  )
}

const SHARED_DATA = [
  'Your skin progress photos and journal entries',
  'Your personalised Derm report',
  'Skin type, concerns, and treatment history',
  'Current skincare routine and medications',
]

function NoBookingState() {
  return (
    <div className="min-h-screen bg-hazel-off-white">
      <NavHeader subtitle="companion" />
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-hazel-sage/15 flex items-center justify-center mx-auto mb-7">
          <LeafIcon className="w-6 h-6 text-hazel-sage" />
        </div>
        <h2 className="hazel-wordmark font-light text-4xl tracking-tight text-hazel-green mb-3">hazel companion</h2>
        <p className="text-hazel-muted leading-relaxed mb-3">
          Link your hazel account to share your full skin history with your clinician — automatically — before your appointment.
        </p>
        <p className="text-hazel-muted/60 text-sm">
          To activate, open the link sent to you via WhatsApp after booking your appointment.
        </p>
        <div className="mt-8 border-t border-hazel-cream pt-6">
          <p className="text-hazel-muted/60 text-sm mb-2">Don&apos;t have hazel yet?</p>
          <a
            href="https://hazelskincoach.vercel.app/patient/onboarding"
            target="_blank"
            rel="noreferrer"
            className="text-hazel-sage text-sm underline underline-offset-2 hover:text-hazel-green transition-colors"
          >
            Start tracking your skin — it takes 2 minutes
          </a>
        </div>
      </div>
    </div>
  )
}

type IntakeSummary = {
  skin_type: string
  fitzpatrick_scale: number | null
  primary_concern: string
  concern_duration: string
  previous_treatments: string
  allergies: string
  current_medications: string
}

function PassportContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('bookingId')

  const [email, setEmail] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [patientName, setPatientName] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [appointmentSlot, setAppointmentSlot] = useState('')
  const [activated, setActivated] = useState(false)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [intake, setIntake] = useState<IntakeSummary | null>(null)

  useEffect(() => {
    if (!bookingId) return
    const supabase = createBrowserClient()
    supabase
      .from('bookings')
      .select('patient_name, passport_linked, preferred_slot, phone, clinics(name)')
      .eq('id', bookingId)
      .single()
      .then(({ data }) => {
        if (data) {
          setPatientName(data.patient_name ?? '')
          setAppointmentSlot(data.preferred_slot ?? '')
          setPatientPhone(data.phone ?? '')
          setClinicName((data as { clinics?: { name?: string } }).clinics?.name ?? '')
          if (data.passport_linked) setActivated(true)
        }
      })
    supabase
      .from('intake_submissions')
      .select('skin_type, fitzpatrick_scale, primary_concern, concern_duration, previous_treatments, allergies, current_medications')
      .eq('booking_id', bookingId)
      .single()
      .then(({ data }) => { if (data) setIntake(data) })
  }, [bookingId])

  const handleActivate = async () => {
    if (!email.trim()) {
      setError('Please enter your hazel account email address.')
      return
    }
    setActivating(true)
    setError('')
    const supabase = createBrowserClient()

    await supabase.from('bookings').update({ passport_linked: true }).eq('id', bookingId)
    await supabase.from('intake_submissions').update({ passport_email: email.trim() }).eq('booking_id', bookingId)

    // Send companion link via WhatsApp if we have a phone number
    if (patientPhone) {
      try {
        await fetch('/api/send-companion-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId }),
        })
        setInviteSent(true)
      } catch {
        // non-critical — activation still succeeds
      }
    }

    setActivating(false)
    setActivated(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!bookingId) return <NoBookingState />

  return (
    <div className="min-h-screen bg-hazel-off-white">
      <NavHeader subtitle="companion" />

      <div className="max-w-lg mx-auto px-6 py-12">
        {activated ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-hazel-mint flex items-center justify-center mx-auto mb-7">
              <LeafIcon className="w-7 h-7 text-hazel-sage" />
            </div>
            <h2 className="hazel-wordmark font-light text-4xl tracking-tight text-hazel-green mb-3">You&apos;re all set</h2>
            <p className="text-hazel-muted mb-2">
              {patientName ? `${patientName}, your` : 'Your'} skin history is now linked to your appointment
              {clinicName ? <> at <strong>{clinicName}</strong></> : ''}.
            </p>
            {appointmentSlot && (
              <p className="text-hazel-muted/60 text-sm mb-4">
                Appointment: <span className="font-medium text-hazel-green">{appointmentSlot}</span>
              </p>
            )}
            {inviteSent && (
              <p className="text-sm text-hazel-sage mb-4">
                ✓ A link to hazel companion has been sent to your WhatsApp.
              </p>
            )}
            <div className="bg-hazel-mint/40 rounded-2xl border border-hazel-sage/20 p-5 text-left mt-4">
              <p className="text-xs font-medium text-hazel-green mb-3">Your clinician will have access to:</p>
              <ul className="space-y-2.5">
                {SHARED_DATA.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-hazel-muted">
                    <span className="mt-0.5 text-hazel-sage flex-shrink-0"><CheckIcon /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-7">
              <a
                href="https://hazelskincoach.vercel.app/patient/onboarding"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-hazel-green text-hazel-cream px-6 py-3 rounded-full text-sm font-medium hover:bg-hazel-green-light transition-colors"
              >
                <LeafIcon className="w-4 h-4" />
                Open hazel companion
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="hazel-wordmark font-light text-4xl tracking-tight text-hazel-green mb-1">
                {patientName ? `Welcome, ${patientName}` : 'hazel companion'}
              </h2>
              {clinicName && (
                <p className="text-hazel-muted mt-1">
                  You&apos;ve booked at <strong>{clinicName}</strong>, a hazel-powered clinic.
                </p>
              )}
              {appointmentSlot && (
                <p className="text-hazel-muted/60 text-sm mt-1">
                  Appointment: <span className="font-medium text-hazel-green">{appointmentSlot}</span>
                </p>
              )}
            </div>

            {/* What clinician will see */}
            <div className="bg-hazel-mint/30 rounded-2xl border border-hazel-sage/20 p-5 mb-4">
              <p className="text-[10px] uppercase tracking-widest text-hazel-muted/50 mb-4">
                What your clinician will see
              </p>
              {intake ? (
                <dl className="space-y-3">
                  {intake.primary_concern && (
                    <div className="flex gap-2.5">
                      <span className="mt-0.5 text-hazel-sage flex-shrink-0"><CheckIcon /></span>
                      <div>
                        <dt className="text-[10px] uppercase tracking-widest text-hazel-muted/50">Primary concern</dt>
                        <dd className="text-sm text-hazel-muted">{intake.primary_concern}{intake.concern_duration ? ` · ${intake.concern_duration}` : ''}</dd>
                      </div>
                    </div>
                  )}
                  {intake.skin_type && (
                    <div className="flex gap-2.5">
                      <span className="mt-0.5 text-hazel-sage flex-shrink-0"><CheckIcon /></span>
                      <div>
                        <dt className="text-[10px] uppercase tracking-widest text-hazel-muted/50">Skin type</dt>
                        <dd className="text-sm text-hazel-muted capitalize">{intake.skin_type}{intake.fitzpatrick_scale ? ` · Fitzpatrick Type ${intake.fitzpatrick_scale}` : ''}</dd>
                      </div>
                    </div>
                  )}
                  {intake.previous_treatments && (
                    <div className="flex gap-2.5">
                      <span className="mt-0.5 text-hazel-sage flex-shrink-0"><CheckIcon /></span>
                      <div>
                        <dt className="text-[10px] uppercase tracking-widest text-hazel-muted/50">Previous treatments</dt>
                        <dd className="text-sm text-hazel-muted">{intake.previous_treatments}</dd>
                      </div>
                    </div>
                  )}
                  {intake.allergies && (
                    <div className="flex gap-2.5">
                      <span className="mt-0.5 text-hazel-sage flex-shrink-0"><CheckIcon /></span>
                      <div>
                        <dt className="text-[10px] uppercase tracking-widest text-hazel-muted/50">Allergies</dt>
                        <dd className="text-sm text-hazel-muted">{intake.allergies}</dd>
                      </div>
                    </div>
                  )}
                  {intake.current_medications && (
                    <div className="flex gap-2.5">
                      <span className="mt-0.5 text-hazel-sage flex-shrink-0"><CheckIcon /></span>
                      <div>
                        <dt className="text-[10px] uppercase tracking-widest text-hazel-muted/50">Current medications</dt>
                        <dd className="text-sm text-hazel-muted">{intake.current_medications}</dd>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2.5">
                    <span className="mt-0.5 text-hazel-sage flex-shrink-0"><CheckIcon /></span>
                    <div className="text-sm text-hazel-muted">Skin progress photos and journal entries</div>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="mt-0.5 text-hazel-sage flex-shrink-0"><CheckIcon /></span>
                    <div className="text-sm text-hazel-muted">Personalised Derm report</div>
                  </div>
                </dl>
              ) : (
                <ul className="space-y-3">
                  {SHARED_DATA.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-hazel-muted">
                      <span className="mt-0.5 text-hazel-sage flex-shrink-0"><CheckIcon /></span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs text-hazel-muted/50 border-t border-hazel-sage/10 pt-4">
                No forms to fill in. No uploads. Your clinician arrives prepared — you arrive confident.
              </p>
            </div>

            {/* Activation form */}
            <div className="bg-white rounded-2xl border border-hazel-cream p-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-hazel-green mb-0.5">
                  Link your hazel companion account
                </p>
                <p className="text-xs text-hazel-muted/60 mb-4">
                  Enter the email you use to log in to hazel companion.
                </p>
                <label className="block text-xs text-hazel-muted/60 mb-1.5">Email address</label>
                <input
                  type="email"
                  className="hazel-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
              )}

              <button
                onClick={handleActivate}
                disabled={activating}
                className="w-full hazel-btn-primary py-3.5 text-base disabled:opacity-50"
              >
                {activating ? 'Linking…' : 'Link my hazel account'}
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-hazel-muted/50 text-sm mb-1">Don&apos;t have hazel yet?</p>
              <a
                href="https://hazelskincoach.vercel.app/patient/onboarding"
                target="_blank"
                rel="noreferrer"
                className="text-hazel-sage text-sm underline underline-offset-2 hover:text-hazel-green transition-colors"
              >
                Start tracking your skin — it takes 2 minutes
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function PassportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-hazel-off-white flex items-center justify-center">
          <span className="text-hazel-muted text-sm">Loading…</span>
        </div>
      }
    >
      <PassportContent />
    </Suspense>
  )
}
