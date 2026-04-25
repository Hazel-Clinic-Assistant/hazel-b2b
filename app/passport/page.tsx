'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className ?? 'w-4 h-4'}>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 5.5-11.5 7.5L8 9.5C8 9.5 14 7 17 8z" />
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
    <div className="min-h-screen bg-[#FAF8F3]">
      <header className="bg-[#1C3A2E] px-6 py-5">
        <div className="flex items-center gap-2">
          <LeafIcon className="w-5 h-5 text-[#E8D5B0]/60" />
          <span className="hazel-wordmark text-[#E8D5B0] text-xl">Hazel Passport</span>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-hazel-green/10 flex items-center justify-center mx-auto mb-6">
          <LeafIcon className="w-8 h-8 text-hazel-sage" />
        </div>
        <h2 className="hazel-wordmark text-4xl text-hazel-green mb-3">Hazel Passport</h2>
        <p className="text-hazel-muted mb-6">
          Passport lets your clinician access your full Hazel skin history — automatically — before your appointment.
        </p>
        <p className="text-hazel-muted text-sm">
          To activate your Passport, open the link sent to you via WhatsApp after booking your appointment.
        </p>
        <div className="mt-8 border-t border-hazel-cream pt-6">
          <p className="text-hazel-muted text-sm mb-2">Don&apos;t have Hazel yet?</p>
          <a
            href={process.env.NEXT_PUBLIC_SKIN_COACH_URL}
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

function PassportContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('bookingId')

  const [email, setEmail] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [patientName, setPatientName] = useState('')
  const [appointmentSlot, setAppointmentSlot] = useState('')
  const [activated, setActivated] = useState(false)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!bookingId) return
    const supabase = createBrowserClient()
    supabase
      .from('bookings')
      .select('patient_name, passport_linked, preferred_slot, clinics(name)')
      .eq('id', bookingId)
      .single()
      .then(({ data }) => {
        if (data) {
          setPatientName(data.patient_name ?? '')
          setAppointmentSlot(data.preferred_slot ?? '')
          setClinicName((data as { clinics?: { name?: string } }).clinics?.name ?? '')
          if (data.passport_linked) setActivated(true)
        }
      })
  }, [bookingId])

  const handleActivate = async () => {
    if (!email.trim()) {
      setError('Please enter your Hazel Companion email address.')
      return
    }
    setActivating(true)
    setError('')
    const supabase = createBrowserClient()

    await supabase
      .from('bookings')
      .update({ passport_linked: true })
      .eq('id', bookingId)

    await supabase
      .from('intake_submissions')
      .update({ passport_email: email.trim() })
      .eq('booking_id', bookingId)

    setActivating(false)
    setActivated(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!bookingId) return <NoBookingState />

  return (
    <div className="min-h-screen bg-[#FAF8F3]">
      <header className="bg-[#1C3A2E] px-6 py-5">
        <div className="flex items-center gap-2">
          <LeafIcon className="w-5 h-5 text-[#E8D5B0]/60" />
          <span className="hazel-wordmark text-[#E8D5B0] text-xl">Hazel Passport</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-6 py-12">
        {activated ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <LeafIcon className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="hazel-wordmark text-4xl text-hazel-green mb-3">You&apos;re all set</h2>
            <p className="text-hazel-muted mb-2">
              {patientName ? `${patientName}, your` : 'Your'} skin history is now linked to your appointment
              {clinicName ? <> at <strong>{clinicName}</strong></> : ''}.
            </p>
            {appointmentSlot && (
              <p className="text-hazel-muted text-sm mb-6">
                Appointment: <span className="font-medium text-hazel-green">{appointmentSlot}</span>
              </p>
            )}
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5 text-left mt-6">
              <p className="text-sm font-medium text-emerald-800 mb-3">Your clinician will have access to:</p>
              <ul className="space-y-2">
                {SHARED_DATA.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-emerald-700">
                    <span className="mt-0.5 text-emerald-500 flex-shrink-0"><CheckIcon /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="hazel-wordmark text-4xl text-hazel-green mb-1">
                {patientName ? `Welcome, ${patientName}` : 'Your Hazel Passport'}
              </h2>
              {clinicName && (
                <p className="text-hazel-muted">
                  You&apos;ve booked at <strong>{clinicName}</strong>, a Hazel-powered clinic.
                </p>
              )}
              {appointmentSlot && (
                <p className="text-hazel-muted text-sm mt-1">
                  Appointment: <span className="font-medium text-hazel-green">{appointmentSlot}</span>
                </p>
              )}
            </div>

            {/* What clinician will see */}
            <div className="bg-white rounded-2xl border border-hazel-cream p-5 mb-5">
              <p className="text-xs font-medium text-hazel-muted uppercase tracking-wider mb-3">
                What your clinician will see
              </p>
              <ul className="space-y-2.5">
                {SHARED_DATA.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-hazel-muted">
                    <span className="mt-0.5 text-hazel-sage flex-shrink-0"><CheckIcon /></span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-hazel-muted/60">
                No forms to fill in. No uploads. Your clinician arrives prepared — you arrive confident.
              </p>
            </div>

            {/* Activation form */}
            <div className="bg-white rounded-2xl border border-hazel-cream p-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-hazel-green mb-0.5">
                  Link your Hazel Companion account
                </p>
                <p className="text-xs text-hazel-muted mb-3">
                  Enter the email you use to log in to the Hazel Companion app.
                </p>
                <label className="block text-xs text-hazel-muted mb-1.5">Email address</label>
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
                {activating ? 'Activating…' : 'Activate Passport'}
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-hazel-muted text-sm mb-1">Don&apos;t have Hazel yet?</p>
              <a
                href={process.env.NEXT_PUBLIC_SKIN_COACH_URL}
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
        <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center">
          <span className="text-hazel-muted text-sm">Loading…</span>
        </div>
      }
    >
      <PassportContent />
    </Suspense>
  )
}
