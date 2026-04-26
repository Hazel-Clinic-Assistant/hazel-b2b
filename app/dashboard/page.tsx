'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { NavHeader } from '@/app/components/NavHeader'

type Booking = {
  id: string
  patient_name: string
  skin_concern: string
  urgency: 'low' | 'medium' | 'high'
  preferred_slot: string
  whatsapp_status: string
  passport_linked: boolean
  intake_complete: boolean
  phone: string
  created_at: string
  clinic_id: string
}

type IntakeSubmission = {
  id: string
  booking_id: string
  patient_name: string
  date_of_birth: string
  skin_type: string
  fitzpatrick_scale: number
  primary_concern: string
  concern_duration: string
  previous_treatments: string
  current_skincare_routine: string
  current_medications: string
  allergies: string
  photo_urls: string[]
  gp_name: string
  gp_address: string
  passport_email: string
  passport_derm_report: string
  consented_at: string
  created_at: string
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-4 h-4'}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

function UrgencyPill({ urgency }: { urgency: string }) {
  const cls: Record<string, string> = {
    low: 'pill-low',
    medium: 'pill-medium',
    high: 'pill-high',
  }
  return <span className={cls[urgency] ?? 'pill-pending'}>{urgency}</span>
}

function WhatsAppPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    pending: 'pill-pending',
    sent: 'pill-sent',
    delivered: 'pill-delivered',
    failed: 'pill-failed',
  }
  return <span className={cls[status] ?? 'pill-pending'}>{status}</span>
}

function PassportBanner({
  booking,
  submission,
  onSendInvite,
}: {
  booking: Booking
  submission?: IntakeSubmission
  onSendInvite: (bookingId: string) => void
}) {
  if (booking.passport_linked) {
    return (
      <div className="mt-3 rounded-xl bg-hazel-mint/50 border border-hazel-sage/20 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <LeafIcon className="w-4 h-4 text-hazel-sage" />
          <span className="text-sm font-medium text-hazel-green">
            This patient has linked their hazel companion
          </span>
        </div>
        <p className="text-xs text-hazel-muted">
          Their skin history, progress photos, and Derm report will appear here once synced.
        </p>
        {submission?.passport_derm_report ? (
          <div className="mt-3 bg-white rounded-lg border border-hazel-cream p-3">
            <p className="text-xs font-medium text-hazel-green mb-1">Derm Report</p>
            <p className="text-xs text-hazel-muted whitespace-pre-wrap">{submission.passport_derm_report}</p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-hazel-muted/50 italic">
            Awaiting sync from hazel companion…
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        onClick={() => onSendInvite(booking.id)}
        className="text-xs font-medium border border-hazel-green text-hazel-green px-4 py-1.5 rounded-full hover:bg-hazel-green hover:text-hazel-cream transition-colors"
      >
        Send Passport invite
      </button>
      <span className="text-xs text-hazel-muted/50">Patient hasn&apos;t linked hazel yet</span>
    </div>
  )
}

function IntakeDetail({ submission }: { submission: IntakeSubmission }) {
  const rows = [
    ['Date of birth', submission.date_of_birth],
    ['Skin type', submission.skin_type],
    ['Fitzpatrick scale', submission.fitzpatrick_scale ? `Type ${submission.fitzpatrick_scale}` : '—'],
    ['Primary concern', submission.primary_concern],
    ['Duration', submission.concern_duration],
    ['Previous treatments', submission.previous_treatments],
    ['Current routine', submission.current_skincare_routine],
    ['Medications', submission.current_medications],
    ['Allergies', submission.allergies],
    ['GP', submission.gp_name],
    ['GP address', submission.gp_address],
  ]

  return (
    <div className="mt-4 bg-hazel-off-white rounded-xl border border-hazel-cream p-4 space-y-3">
      <p className="text-[10px] font-medium text-hazel-muted/60 uppercase tracking-widest">Intake submission</p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {rows.map(([label, value]) =>
          value ? (
            <div key={label as string}>
              <dt className="text-xs text-hazel-muted/60 mb-0.5">{label}</dt>
              <dd className="text-hazel-green text-sm">{value}</dd>
            </div>
          ) : null
        )}
      </dl>
      {submission.photo_urls?.length > 0 && (
        <div>
          <p className="text-xs text-hazel-muted/60 mb-2">Photos</p>
          <div className="flex gap-2 flex-wrap">
            {submission.photo_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={`Photo ${i + 1}`} className="w-16 h-16 rounded-lg object-cover border border-hazel-cream hover:opacity-80 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const clinicParam = searchParams.get('clinic') ?? 'demo-clinic'

  const [clinicName, setClinicName] = useState<string>('')
  const [tab, setTab] = useState<'bookings' | 'intake'>('bookings')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [submissions, setSubmissions] = useState<IntakeSubmission[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sendingInvite, setSendingInvite] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState<Set<string>>(new Set())

  const submissionByBooking = (bookingId: string) =>
    submissions.find((s) => s.booking_id === bookingId)

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient()

    const [{ data: bookingData }, { data: submissionData }, { data: clinicData }] = await Promise.all([
      supabase
        .from('bookings')
        .select('*')
        .eq('clinic_id', clinicParam)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('intake_submissions')
        .select('*')
        .eq('clinic_id', clinicParam)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('clinics')
        .select('name')
        .eq('id', clinicParam)
        .single(),
    ])

    if (bookingData) setBookings(bookingData)
    if (submissionData) setSubmissions(submissionData)
    if (clinicData) setClinicName(clinicData.name)
  }, [clinicParam])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const supabase = createBrowserClient()

    const bookingsChannel = supabase
      .channel('dashboard-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `clinic_id=eq.${clinicParam}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBookings((prev) => [payload.new as Booking, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setBookings((prev) =>
              prev.map((b) => (b.id === payload.new.id ? (payload.new as Booking) : b))
            )
          }
        }
      )
      .subscribe()

    const intakeChannel = supabase
      .channel('dashboard-intake')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'intake_submissions', filter: `clinic_id=eq.${clinicParam}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSubmissions((prev) => [payload.new as IntakeSubmission, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setSubmissions((prev) =>
              prev.map((s) => (s.id === payload.new.id ? (payload.new as IntakeSubmission) : s))
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(bookingsChannel)
      supabase.removeChannel(intakeChannel)
    }
  }, [clinicParam])

  const handleSendInvite = async (bookingId: string) => {
    setSendingInvite(bookingId)
    try {
      await fetch('/api/send-passport-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      })
      setInviteSent((prev) => { const next = new Set(Array.from(prev)); next.add(bookingId); return next })
    } catch (err) {
      console.error(err)
    } finally {
      setSendingInvite(null)
    }
  }

  return (
    <div className="min-h-screen bg-hazel-off-white">
      <NavHeader
        subtitle={clinicName || undefined}
        right={
          <span className="flex items-center gap-1.5 text-xs text-hazel-cream/50">
            <span className="w-1.5 h-1.5 rounded-full bg-hazel-sage animate-pulse" />
            Live
          </span>
        }
      />

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-hazel-cream px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="hazel-wordmark font-light text-3xl tracking-tight text-hazel-green mb-1">
            {clinicName || clinicParam}
          </h1>
          <p className="text-hazel-muted text-sm">
            Every booking, every intake, every patient — prepared before they walk in the door.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Bookings', value: bookings.length },
            { label: 'Intake received', value: submissions.length },
            {
              label: 'High urgency',
              value: bookings.filter((b) => b.urgency === 'high').length,
              highlight: bookings.some((b) => b.urgency === 'high'),
            },
            {
              label: 'Companion linked',
              value: bookings.filter((b) => b.passport_linked).length,
            },
          ].map(({ label, value, highlight }) => (
            <div
              key={label}
              className={`rounded-2xl border p-5 ${highlight ? 'border-red-200 bg-red-50' : 'border-hazel-cream bg-white'}`}
            >
              <p className={`text-3xl font-light tabular-nums ${highlight ? 'text-red-700' : 'text-hazel-green'}`}>
                {value}
              </p>
              <p className={`text-xs mt-1 ${highlight ? 'text-red-500' : 'text-hazel-muted/70'}`}>{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-hazel-cream">
          <button
            onClick={() => setTab('bookings')}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === 'bookings'
                ? 'border-hazel-green text-hazel-green'
                : 'border-transparent text-hazel-muted hover:text-hazel-green'
            }`}
          >
            Bookings
            {bookings.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-hazel-green text-hazel-cream text-xs">
                {bookings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('intake')}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === 'intake'
                ? 'border-hazel-green text-hazel-green'
                : 'border-transparent text-hazel-muted hover:text-hazel-green'
            }`}
          >
            Intake Submissions
            {submissions.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-hazel-sage/20 text-hazel-sage text-xs border border-hazel-sage/20">
                {submissions.length}
              </span>
            )}
          </button>
        </div>

        {/* Bookings tab */}
        {tab === 'bookings' && (
          <div className="rounded-2xl border border-hazel-cream bg-white overflow-hidden">
            {bookings.length === 0 ? (
              <div className="py-16 text-center text-hazel-muted/50 text-sm">
                No bookings yet. Call hazel on the home page to create one.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hazel-cream bg-hazel-off-white">
                    {['Patient', 'Concern', 'Urgency', 'Slot', 'WhatsApp', 'Companion'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-hazel-muted font-medium text-xs uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hazel-cream/50">
                  {bookings.map((booking) => {
                    const isExpanded = expandedId === booking.id
                    const submission = submissionByBooking(booking.id)
                    return (
                      <>
                        <tr
                          key={booking.id}
                          onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                          className="hover:bg-hazel-off-white/60 transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-3.5 font-medium text-hazel-green">
                            {booking.patient_name}
                          </td>
                          <td className="px-5 py-3.5 text-hazel-muted capitalize">
                            {booking.skin_concern}
                          </td>
                          <td className="px-5 py-3.5">
                            <UrgencyPill urgency={booking.urgency} />
                          </td>
                          <td className="px-5 py-3.5 text-hazel-muted">{booking.preferred_slot}</td>
                          <td className="px-5 py-3.5">
                            <WhatsAppPill status={booking.whatsapp_status} />
                          </td>
                          <td className="px-5 py-3.5">
                            {booking.passport_linked ? (
                              <LeafIcon className="w-4 h-4 text-hazel-sage" />
                            ) : (
                              <span className="text-hazel-cream/60 text-lg leading-none">—</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${booking.id}-detail`}>
                            <td colSpan={6} className="px-5 py-5 bg-hazel-off-white/50 border-t border-hazel-cream/60">
                              {submission ? (
                                <IntakeDetail submission={submission} />
                              ) : (
                                <p className="text-sm text-hazel-muted/50 italic">
                                  No intake submission yet.
                                </p>
                              )}
                              <PassportBanner
                                booking={booking}
                                submission={submission}
                                onSendInvite={(id) => {
                                  if (sendingInvite !== id && !inviteSent.has(id)) {
                                    handleSendInvite(id)
                                  }
                                }}
                              />
                              {inviteSent.has(booking.id) && !booking.passport_linked && (
                                <p className="mt-2 text-xs text-hazel-sage">
                                  ✓ Companion invite sent via WhatsApp
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Intake submissions tab */}
        {tab === 'intake' && (
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <div className="rounded-2xl border border-hazel-cream bg-white py-16 text-center text-hazel-muted/50 text-sm">
                No intake submissions yet.
              </div>
            ) : (
              submissions.map((sub) => {
                const booking = bookings.find((b) => b.id === sub.booking_id)
                return (
                  <div key={sub.id} className="rounded-2xl border border-hazel-cream bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-hazel-green">{sub.patient_name}</h3>
                        <p className="text-sm text-hazel-muted mt-0.5">{sub.primary_concern}</p>
                        {sub.skin_type && (
                          <p className="text-xs text-hazel-muted/50 mt-0.5 capitalize">
                            {sub.skin_type} skin · Fitzpatrick {sub.fitzpatrick_scale ?? '—'}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {booking && <UrgencyPill urgency={booking.urgency} />}
                        <p className="text-xs text-hazel-muted/40 mt-1">
                          {new Date(sub.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {sub.passport_email && (
                      <div className="mt-3 inline-flex items-center gap-1.5 bg-hazel-mint/50 border border-hazel-sage/20 rounded-full px-3 py-1">
                        <LeafIcon className="w-3 h-3 text-hazel-sage" />
                        <span className="text-xs text-hazel-green">
                          Companion: {sub.passport_email}
                        </span>
                      </div>
                    )}

                    {sub.passport_derm_report && (
                      <div className="mt-3 rounded-xl bg-hazel-mint/40 border border-hazel-sage/20 p-3">
                        <p className="text-xs font-medium text-hazel-green mb-1">Derm Report</p>
                        <p className="text-xs text-hazel-muted whitespace-pre-wrap line-clamp-3">
                          {sub.passport_derm_report}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-3 gap-4 text-xs text-hazel-muted border-t border-hazel-cream/50 pt-4">
                      {sub.current_medications && (
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-hazel-muted/50 mb-1">Medications</p>
                          <p className="line-clamp-2">{sub.current_medications}</p>
                        </div>
                      )}
                      {sub.allergies && (
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-hazel-muted/50 mb-1">Allergies</p>
                          <p className="line-clamp-2">{sub.allergies}</p>
                        </div>
                      )}
                      {sub.photo_urls?.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-hazel-muted/50 mb-2">Photos</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {sub.photo_urls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer">
                                <img
                                  src={url}
                                  alt={`Photo ${i + 1}`}
                                  className="w-12 h-12 rounded-lg object-cover border border-hazel-cream hover:opacity-80 transition-opacity"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-hazel-off-white flex items-center justify-center">
          <span className="text-hazel-muted text-sm">Loading dashboard…</span>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
