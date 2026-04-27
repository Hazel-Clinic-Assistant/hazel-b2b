'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { NavHeader } from './components/NavHeader'
import { SpeechInputButton } from './components/SpeechInputButton'
import { buildSystemPrompt, DEFAULT_CLINIC, type ClinicData } from '@/lib/clinic-prompt'

const DEMO_CLINIC_ID = 'demo-clinic'

type Booking = {
  id: string
  patient_name: string
  skin_concern: string
  preferred_slot: string
  whatsapp_status: string
  passport_linked: boolean
  intake_complete: boolean
  urgency: string
  created_at: string
}

type IntakeSubmission = {
  id: string
  booking_id: string
  patient_name: string
  date_of_birth: string
  skin_type: string
  fitzpatrick_scale: number | null
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
  consented_at: string
}

const FIXTURE_BOOKING: Booking = {
  id: '__fixture__',
  patient_name: 'Amara Osei-Bonsu',
  skin_concern: 'hyperpigmentation & melasma',
  preferred_slot: 'Thu 2pm',
  whatsapp_status: 'delivered',
  passport_linked: true,
  intake_complete: true,
  urgency: 'high',
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
}

const FIXTURE_SUBMISSION: IntakeSubmission = {
  id: '__fixture__',
  booking_id: '__fixture__',
  patient_name: 'Amara Osei-Bonsu',
  date_of_birth: '1988-03-12',
  skin_type: 'combination',
  fitzpatrick_scale: 4,
  primary_concern: 'Hyperpigmentation and melasma — significant darkening across cheeks and upper lip, worsened considerably after second pregnancy',
  concern_duration: '3 years',
  previous_treatments: 'Chemical peels ×5 (Jessner\'s, 2021–2022) · Cosmelan depigmentation peel (Apr 2023) · IPL ×3 — discontinued after rebound hyperpigmentation',
  current_skincare_routine: 'AM: gentle foaming cleanser · niacinamide 10% · tranexamic acid serum · SPF 50+ mineral (reapplied at lunch)\nPM: micellar cleanse · kojic acid cream (Rx) · ceramide barrier moisturiser',
  current_medications: 'Tranexamic acid 250mg oral (dermatologist Rx) · Kojic acid 2% topical (Rx) · Cetirizine 10mg (seasonal)',
  allergies: 'Hydroquinone (severe irritation, contact dermatitis) · Fragrance · Propylene glycol',
  gp_name: 'Dr. Priya Nair',
  gp_address: 'Southwark Health Centre, 97 Peckham Road, London SE15 4SF',
  passport_email: 'amara@hazel.health',
  consented_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  photo_urls: [],
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-4 h-4'}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-5 h-5'}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.07 6.07l.97-.97a2 2 0 0 1 2.11-.45c.9.36 1.85.6 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-4 h-4'}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function HourglassIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-4 h-4'}>
      <path d="M5 22h14" /><path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </svg>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className ?? 'w-5 h-5'}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function WhatsAppPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    pending: 'pill-pending', sent: 'pill-sent', delivered: 'pill-delivered',
    failed: 'pill-failed', reminder_sent: 'pill-delivered',
  }
  return <span className={cls[status] ?? 'pill-pending'}>{status.replace('_', ' ')}</span>
}

type SetupState = 'idle' | 'loading' | 'done' | 'error'
type CallbackState = 'idle' | 'requesting' | 'confirmed' | 'error'
type VapiState = 'idle' | 'connecting' | 'active' | 'ended'

export default function HomePage() {
  // Clinic setup
  const [clinicUrl, setClinicUrl] = useState('')
  const [setupState, setSetupState] = useState<SetupState>('idle')
  const [setupError, setSetupError] = useState('')
  const [clinicData, setClinicData] = useState<ClinicData | null>(null)
  const [clinicId, setClinicId] = useState<string | null>(null)

  // Restore custom clinic from localStorage so page refresh doesn't lose the ref
  useEffect(() => {
    const savedId = localStorage.getItem('hazel_clinic_id')
    const savedData = localStorage.getItem('hazel_clinic_data')
    if (savedId && savedData) {
      try {
        setClinicId(savedId)
        setClinicData(JSON.parse(savedData))
        setSetupState('done')
      } catch {}
    }
  }, [])

  // Shared name + phone
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // Call states
  const [callbackState, setCallbackState] = useState<CallbackState>('idle')
  const [vapiState, setVapiState] = useState<VapiState>('idle')

  const [bookings, setBookings] = useState<Booking[]>([])
  const [submissions, setSubmissions] = useState<IntakeSubmission[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [nameHint, setNameHint] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null)

  const hasName = name.trim().length > 0

  const focusName = () => {
    nameRef.current?.focus()
    setNameHint(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => setNameHint(false), 1500)
  }

  const handleClearDemo = async () => {
    if (!clearConfirm) { setClearConfirm(true); return }
    setClearing(true)
    await fetch('/api/clear-demo', { method: 'POST' })
    setBookings([])
    setSubmissions([])
    setExpandedId(null)
    setClearing(false)
    setClearConfirm(false)
  }

  // The active clinic — custom if loaded, otherwise HSSC default
  const activeClinic: ClinicData = clinicData ?? DEFAULT_CLINIC

  const loadBookings = useCallback(async () => {
    const supabase = createBrowserClient()
    const [{ data: bookingData }, { data: submissionData }] = await Promise.all([
      supabase.from('bookings').select('*').eq('clinic_id', DEMO_CLINIC_ID)
        .order('created_at', { ascending: false }).limit(20),
      supabase.from('intake_submissions').select('*').eq('clinic_id', DEMO_CLINIC_ID)
        .order('created_at', { ascending: false }).limit(20),
    ])
    if (bookingData) setBookings(bookingData)
    if (submissionData) setSubmissions(submissionData)
  }, [])

  useEffect(() => { loadBookings() }, [loadBookings])

  useEffect(() => {
    const supabase = createBrowserClient()
    const channel = supabase.channel('demo-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `clinic_id=eq.${DEMO_CLINIC_ID}` }, (payload) => {
        if (payload.eventType === 'INSERT') setBookings((prev) => [payload.new as Booking, ...prev])
        else if (payload.eventType === 'UPDATE') setBookings((prev) => prev.map((b) => b.id === payload.new.id ? payload.new as Booking : b))
        else if (payload.eventType === 'DELETE') setBookings((prev) => prev.filter((b) => b.id !== (payload.old as Booking).id))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'intake_submissions', filter: `clinic_id=eq.${DEMO_CLINIC_ID}` }, (payload) => {
        if (payload.eventType === 'INSERT') setSubmissions((prev) => [payload.new as IntakeSubmission, ...prev])
        else if (payload.eventType === 'UPDATE') setSubmissions((prev) => prev.map((s) => s.id === payload.new.id ? payload.new as IntakeSubmission : s))
        else if (payload.eventType === 'DELETE') setSubmissions((prev) => prev.filter((s) => s.id !== (payload.old as IntakeSubmission).id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleSetupClinic = async () => {
    if (!clinicUrl.trim()) return
    setSetupState('loading')
    setSetupError('')
    try {
      const res = await fetch('/api/init-clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: clinicUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.clinic) throw new Error(data.error ?? 'Failed to load clinic')
      setClinicData(data.clinic)
      setClinicId(data.clinicId ?? null)
      localStorage.setItem('hazel_clinic_id', data.clinicId ?? '')
      localStorage.setItem('hazel_clinic_data', JSON.stringify(data.clinic))
      setSetupState('done')
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSetupState('error')
    }
  }

  const handleRequestCallback = async () => {
    if (!phone.trim()) return
    setCallbackState('requesting')
    try {
      const res = await fetch('/api/request-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          name: name.trim() || undefined,
          clinicId: DEMO_CLINIC_ID,
          clinicData: clinicData ?? undefined,
        }),
      })
      if (!res.ok) throw new Error('Request failed')
      setCallbackState('confirmed')
    } catch {
      setCallbackState('error')
    }
  }

  const handleBrowserCall = async () => {
    setVapiState('connecting')
    try {
      const { default: Vapi } = await import('@vapi-ai/web')
      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!)
      vapi.on('call-start', () => setVapiState('active'))
      vapi.on('call-end', () => { setVapiState('ended'); vapiRef.current = null })
      vapi.on('error', () => { setVapiState('idle'); vapiRef.current = null })
      vapiRef.current = vapi

      // Build overrides — always include name; add clinic system prompt if custom clinic loaded
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const overrides: Record<string, any> = {}
      if (name.trim()) {
        overrides.variableValues = { patient_name: name.trim() }
      }
      if (clinicData) {
        overrides.model = {
          messages: [{ role: 'system', content: buildSystemPrompt(clinicData) }],
        }
        const fn = name.trim().split(' ')[0]
        overrides.firstMessage = fn
          ? `Hi ${fn}! I'm hazel calling from ${clinicData.name}. What brings you in today?`
          : `Hi! I'm hazel calling from ${clinicData.name}. What can I help you with today?`
      }

      await vapi.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!, Object.keys(overrides).length ? overrides : undefined)
    } catch {
      setVapiState('idle')
    }
  }

  const handleEndBrowserCall = () => {
    vapiRef.current?.stop()
    setVapiState('ended')
    vapiRef.current = null
  }

  const effectiveClinicId = clinicId ?? 'demo-clinic'
  const waText = name.trim()
    ? `Hi, I'm ${name.trim()} [ref:${effectiveClinicId}]`
    : `Hi [ref:${effectiveClinicId}]`
  const waLink = `https://wa.me/14155238886?text=${encodeURIComponent(waText)}`

  return (
    <div className="min-h-screen bg-hazel-off-white">
      <NavHeader subtitle={activeClinic.name} />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="bg-hazel-off-white px-6 pt-24 pb-20 text-center">
        {/* Leaf mark */}
        <div className="flex justify-center mb-6">
          <div className="w-11 h-11 rounded-full bg-hazel-sage/15 flex items-center justify-center">
            <LeafIcon className="w-5 h-5 text-hazel-sage" />
          </div>
        </div>

        {/* 24/7 badge */}
        <div className="inline-flex items-center gap-1.5 bg-hazel-mint border border-hazel-sage/30 text-hazel-green text-xs font-medium px-3.5 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-hazel-sage animate-pulse" />
          Available 24 / 7 · responds in seconds
        </div>

        <h1 className="hazel-wordmark font-light text-hazel-green text-5xl md:text-6xl tracking-tight leading-tight mb-5 max-w-2xl mx-auto">
          The voice of<br className="hidden sm:block" /> exceptional care.
        </h1>
        <p className="text-hazel-muted text-lg max-w-md mx-auto leading-relaxed mb-12">
          Warm, intelligent and always available — hazel handles bookings, intake, and patient prep so your team can focus on what matters most.
        </p>

        {/* Clinic setup */}
        <div className="max-w-xl mx-auto">
          {setupState === 'done' && clinicData ? (
            <div className="bg-white border border-hazel-cream rounded-2xl px-5 py-4 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-hazel-sage text-lg mt-0.5">✓</span>
                  <div>
                    <p className="font-medium text-hazel-green">{clinicData.name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      {clinicData.address && <p className="text-xs text-hazel-muted">📍 {clinicData.address}</p>}
                      {clinicData.hours && <p className="text-xs text-hazel-muted">🕐 {clinicData.hours}</p>}
                      {clinicData.doctors.length > 0 && (
                        <p className="text-xs text-hazel-muted">👨‍⚕️ {clinicData.doctors.slice(0, 3).join(', ')}{clinicData.doctors.length > 3 ? ` +${clinicData.doctors.length - 3} more` : ''}</p>
                      )}
                      {clinicData.treatments.length > 0 && (
                        <p className="text-xs text-hazel-muted">💉 {clinicData.treatments.slice(0, 4).join(', ')}{clinicData.treatments.length > 4 ? '…' : ''}</p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setClinicData(null); setClinicId(null); setSetupState('idle'); setClinicUrl(''); localStorage.removeItem('hazel_clinic_id'); localStorage.removeItem('hazel_clinic_data') }}
                  className="text-xs text-hazel-muted underline underline-offset-2 shrink-0"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={clinicUrl}
                  onChange={(e) => setClinicUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetupClinic()}
                  placeholder="Enter your clinic website — e.g. https://yourskinclinic.com"
                  className="hazel-input flex-1 text-sm"
                  disabled={setupState === 'loading'}
                />
                <button
                  onClick={handleSetupClinic}
                  disabled={setupState === 'loading' || !clinicUrl.trim()}
                  className="shrink-0 bg-hazel-green text-hazel-cream px-5 py-2.5 rounded-full text-sm font-medium hover:bg-hazel-green-light transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {setupState === 'loading' ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full border-2 border-hazel-cream/30 border-t-hazel-cream animate-spin" />
                      Reading…
                    </span>
                  ) : 'Set up my demo →'}
                </button>
              </div>
              {setupState === 'loading' && (
                <p className="text-xs text-hazel-muted/60 text-center animate-pulse">
                  Reading your clinic website and extracting doctors, treatments & hours…
                </p>
              )}
              {setupState === 'error' && (
                <p className="text-xs text-red-500 text-center">{setupError}</p>
              )}
              {setupState === 'idle' && (
                <p className="text-xs text-hazel-muted/40 text-center">
                  Or scroll down to try the live demo with Harley Street Skin Clinic ↓
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Demo interaction — white band ─────────────────────────────── */}
      <section className="bg-white border-y border-hazel-cream px-6 py-16">
        <div className="max-w-5xl mx-auto">
          {!clinicData && (
            <p className="text-center text-[10px] text-hazel-muted/40 uppercase tracking-[0.2em] mb-1">
              Live demo
            </p>
          )}
          <p className="text-center text-sm font-medium text-hazel-green mb-0.5">
            {activeClinic.name}
          </p>
          {(activeClinic.address || activeClinic.hours) && (
            <p className="text-hazel-muted/50 text-xs text-center mb-10">
              {activeClinic.address}{activeClinic.address && activeClinic.hours && ' · '}{activeClinic.hours}
            </p>
          )}

          {/* Name input */}
          <div className="max-w-xs mx-auto mb-10">
            <div className="relative">
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={`hazel-input text-center pr-11 transition-all duration-300 ${nameHint ? 'ring-2 ring-hazel-sage border-hazel-sage' : ''}`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <SpeechInputButton onTranscript={(t) => setName(t)} />
              </div>
            </div>
            {!hasName && (
              <p className="text-xs text-hazel-muted/40 text-center mt-2">Enter your name to get started</p>
            )}
          </div>

          {/* 3-card CTA grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">

            {/* Card 1: WhatsApp */}
            <div className="bg-hazel-off-white rounded-2xl border border-hazel-cream overflow-hidden flex flex-col">
              <div className="h-0.5 bg-[#25D366]" />
              <div className="px-6 py-6 flex flex-col flex-1">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
                    <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                  </div>
                  <p className="text-sm font-medium text-hazel-green">chat with hazel</p>
                </div>
                <p className="text-hazel-muted text-sm mb-6 flex-1 leading-relaxed">
                  Ask about {activeClinic.name} treatments or book over WhatsApp. hazel replies instantly, 24/7.
                </p>
                {hasName ? (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-full font-medium hover:bg-[#1ebe5d] transition-colors text-sm"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    Open WhatsApp
                  </a>
                ) : (
                  <button
                    onClick={focusName}
                    className="w-full inline-flex items-center justify-center bg-hazel-cream text-hazel-muted/50 py-3 rounded-full font-medium text-sm hover:bg-hazel-cream/80 transition-colors"
                  >
                    Enter your name first ↑
                  </button>
                )}
              </div>
            </div>

            {/* Card 2: Browser call */}
            <div className="bg-hazel-off-white rounded-2xl border border-hazel-cream overflow-hidden flex flex-col">
              <div className="h-0.5 bg-hazel-sage" />
              <div className="px-6 py-6 flex flex-col flex-1">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-full bg-hazel-sage/10 flex items-center justify-center shrink-0">
                    <PhoneIcon className="w-4 h-4 text-hazel-sage" />
                  </div>
                  <p className="text-sm font-medium text-hazel-green">call hazel here</p>
                </div>

                {vapiState === 'idle' && (
                  <>
                    <p className="text-hazel-muted text-sm mb-6 flex-1 leading-relaxed">
                      Talk to hazel live in your browser — no phone number needed. Just click and speak.
                    </p>
                    {hasName ? (
                      <button onClick={handleBrowserCall} className="w-full bg-hazel-green text-hazel-cream py-3 rounded-full font-medium hover:bg-hazel-green-light transition-colors text-sm">
                        Talk to hazel →
                      </button>
                    ) : (
                      <button onClick={focusName} className="w-full bg-hazel-cream text-hazel-muted/50 py-3 rounded-full font-medium text-sm hover:bg-hazel-cream/80 transition-colors">
                        Enter your name first ↑
                      </button>
                    )}
                  </>
                )}
                {vapiState === 'connecting' && (
                  <>
                    <p className="text-hazel-muted text-sm mb-6 flex-1">Connecting — allow microphone access if prompted.</p>
                    <button disabled className="w-full bg-hazel-green/50 text-hazel-cream py-3 rounded-full font-medium text-sm flex items-center justify-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-hazel-cream/80 animate-ping" />
                      Connecting…
                    </button>
                  </>
                )}
                {vapiState === 'active' && (
                  <>
                    <div className="flex-1 flex flex-col items-center justify-center py-4 gap-3">
                      <div className="relative flex items-center justify-center">
                        <span className="absolute w-12 h-12 rounded-full bg-hazel-sage/20 animate-ping opacity-60" />
                        <span className="relative w-9 h-9 rounded-full bg-hazel-sage flex items-center justify-center">
                          <PhoneIcon className="w-4 h-4 text-white" />
                        </span>
                      </div>
                      <p className="text-sm font-medium text-hazel-green">Connected — speak now</p>
                    </div>
                    <button onClick={handleEndBrowserCall} className="w-full bg-red-500 text-white py-3 rounded-full font-medium hover:bg-red-600 transition-colors text-sm">
                      End call
                    </button>
                  </>
                )}
                {vapiState === 'ended' && (
                  <>
                    <div className="flex-1 flex flex-col items-center justify-center py-4 gap-2">
                      <div className="w-9 h-9 rounded-full bg-hazel-mint flex items-center justify-center">
                        <LeafIcon className="w-4 h-4 text-hazel-sage" />
                      </div>
                      <p className="text-sm font-medium text-hazel-green">Call ended</p>
                      <p className="text-xs text-hazel-muted text-center">Your booking will appear in the live table below.</p>
                    </div>
                    <button onClick={() => setVapiState('idle')} className="w-full border border-hazel-green text-hazel-green py-3 rounded-full font-medium hover:bg-hazel-green hover:text-hazel-cream transition-colors text-sm">
                      Call again
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Card 3: Callback */}
            <div className="bg-hazel-off-white rounded-2xl border border-hazel-cream overflow-hidden flex flex-col">
              <div className="h-0.5 bg-hazel-sage" />
              <div className="px-6 py-6 flex flex-col flex-1">
                {callbackState === 'confirmed' ? (
                  <>
                    <div className="flex-1 flex flex-col items-center justify-center py-4 gap-2">
                      <div className="w-9 h-9 rounded-full bg-hazel-mint flex items-center justify-center">
                        <LeafIcon className="w-4 h-4 text-hazel-sage" />
                      </div>
                      <p className="text-sm font-medium text-hazel-green">{name ? `Calling ${name} now` : 'Calling you now'}</p>
                      <p className="text-xs text-hazel-muted text-center">Expect a call on {phone} within 30 seconds.</p>
                    </div>
                    <button onClick={() => { setCallbackState('idle'); setPhone('') }} className="text-xs text-hazel-muted/50 underline underline-offset-2">
                      Use a different number
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-full bg-hazel-sage/10 flex items-center justify-center shrink-0">
                        <PhoneIcon className="w-4 h-4 text-hazel-sage" />
                      </div>
                      <p className="text-sm font-medium text-hazel-green">get a call back</p>
                    </div>
                    <p className="text-hazel-muted text-sm mb-4 flex-1 leading-relaxed">
                      Enter your number and hazel calls you within 30 seconds — no hold music, no queues.
                    </p>
                    <div className="mb-3">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRequestCallback()}
                        placeholder="+1 555 000 0000"
                        className="hazel-input text-sm"
                      />
                    </div>
                    {hasName ? (
                      <button
                        onClick={handleRequestCallback}
                        disabled={callbackState === 'requesting' || !phone.trim()}
                        className="w-full bg-hazel-green text-hazel-cream py-3 rounded-full font-medium hover:bg-hazel-green-light transition-colors disabled:opacity-50 text-sm"
                      >
                        {callbackState === 'requesting' ? 'Calling you…' : 'Call me now →'}
                      </button>
                    ) : (
                      <button onClick={focusName} className="w-full bg-hazel-cream text-hazel-muted/50 py-3 rounded-full font-medium text-sm hover:bg-hazel-cream/80 transition-colors">
                        Enter your name first ↑
                      </button>
                    )}
                    {callbackState === 'error' && (
                      <p className="mt-2 text-xs text-red-500 text-center">Something went wrong — please try again.</p>
                    )}
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Platform nav ──────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-8 py-10">
        <p className="text-[10px] text-hazel-muted/40 text-center uppercase tracking-[0.2em] mb-5">Explore the full platform</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'clinic dashboard', desc: 'Live bookings, intake & companion', href: '/dashboard', external: false },
            { label: 'intake form', desc: 'Patient pre-appointment questionnaire', href: '/intake?demo=true', external: false },
            { label: 'hazel companion', desc: 'Patient continuity & skin tracking', href: process.env.NEXT_PUBLIC_SKIN_COACH_URL ?? '#', external: true },
          ].map(({ label, desc, href, external }) => (
            <a key={label} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
              className="bg-white rounded-2xl border border-hazel-cream p-5 hover:border-hazel-sage/40 hover:shadow-sm transition-all">
              <p className="text-sm font-medium text-hazel-green mb-0.5">
                {label}{external && <span className="ml-1 text-hazel-muted/40 text-xs">↗</span>}
              </p>
              <p className="text-xs text-hazel-muted/60 leading-relaxed">{desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* ── How hazel works — white band ──────────────────────────────── */}
      <section className="bg-white border-t border-hazel-cream px-8 py-16">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] text-hazel-muted/40 text-center uppercase tracking-[0.2em] mb-14">How hazel works</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { step: '01', title: 'Patient reaches out — any time', body: 'They text on WhatsApp, call live in the browser, or enter their number for a callback. hazel responds instantly, 24 hours a day, 7 days a week.' },
              { step: '02', title: 'hazel books & preps', body: 'During the AI call, hazel collects name, skin concern, urgency and preferred slot — then sends a WhatsApp confirmation with an intake link.' },
              { step: '03', title: 'Clinic arrives informed', body: "The patient's full skin intake, photos, and companion history arrive on the dashboard before the appointment. No paperwork, no surprises." },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-5">
                <span className="text-4xl font-thin text-hazel-sage/30 leading-none shrink-0 tabular-nums">{step}</span>
                <div className="pt-1">
                  <h4 className="font-medium text-hazel-green mb-2 leading-snug">{title}</h4>
                  <p className="text-sm text-hazel-muted leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live bookings ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-8 py-16">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h3 className="text-hazel-green font-medium text-xs uppercase tracking-widest">Live Bookings</h3>
            <span className="flex items-center gap-1.5 text-xs text-hazel-muted/60">
              <span className="w-1.5 h-1.5 rounded-full bg-hazel-sage animate-pulse" />
              Realtime
            </span>
          </div>
          <div className="flex items-center gap-3">
            {clearConfirm ? (
              <span className="flex items-center gap-2">
                <button
                  onClick={handleClearDemo}
                  disabled={clearing}
                  className="text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-1 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {clearing ? 'Clearing…' : 'Yes, clear all'}
                </button>
                <button
                  onClick={() => setClearConfirm(false)}
                  className="text-xs text-hazel-muted/60 hover:text-hazel-muted transition-colors"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={handleClearDemo}
                className="text-xs text-hazel-muted/50 border border-hazel-cream px-3 py-1 rounded-full hover:border-red-200 hover:text-red-500 transition-colors"
              >
                Clear all bookings
              </button>
            )}
            <a href="/dashboard" className="text-xs text-hazel-green border border-hazel-green/30 px-3 py-1 rounded-full hover:bg-hazel-green hover:text-hazel-cream transition-colors">
              Full dashboard →
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-hazel-cream bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hazel-cream bg-hazel-off-white">
                {['Patient', 'Concern', 'Urgency', 'Slot', 'WhatsApp', 'Companion', 'Intake', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-hazel-muted font-medium text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hazel-cream/50">
              {[FIXTURE_BOOKING, ...bookings].map((booking) => {
                const isExpanded = expandedId === booking.id
                const sub = booking.id === '__fixture__'
                  ? FIXTURE_SUBMISSION
                  : submissions.find((s) => s.booking_id === booking.id)
                return (
                  <>
                    <tr
                      key={booking.id}
                      onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                      className="hover:bg-hazel-off-white/60 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 font-medium text-hazel-green">{booking.patient_name}</td>
                      <td className="px-5 py-3.5 text-hazel-muted capitalize">{booking.skin_concern}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          booking.urgency === 'high' ? 'bg-red-100 text-red-700' :
                          booking.urgency === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-hazel-cream/60 text-hazel-muted'
                        }`}>{booking.urgency || '—'}</span>
                      </td>
                      <td className="px-5 py-3.5 text-hazel-muted">{booking.preferred_slot}</td>
                      <td className="px-5 py-3.5"><WhatsAppPill status={booking.whatsapp_status} /></td>
                      <td className="px-5 py-3.5">
                        {booking.passport_linked
                          ? <LeafIcon className="w-4 h-4 text-hazel-sage" />
                          : <span className="text-hazel-cream/60 text-lg leading-none">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {booking.intake_complete
                          ? <CheckIcon className="w-4 h-4 text-hazel-sage" />
                          : <HourglassIcon className="w-4 h-4 text-amber-400" />}
                      </td>
                      <td className="px-5 py-3.5 text-hazel-muted/30 text-xs select-none">
                        {isExpanded ? '▲' : '▼'}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${booking.id}-detail`}>
                        <td colSpan={8} className="px-5 py-5 bg-hazel-off-white/60 border-t border-hazel-cream/60">
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] font-medium text-hazel-muted/60 uppercase tracking-widest mb-3">What hazel learnt on the call</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                  { label: 'Skin concern', value: booking.skin_concern },
                                  { label: 'Urgency', value: booking.urgency },
                                  { label: 'Preferred slot', value: booking.preferred_slot },
                                  { label: 'Booked', value: new Date(booking.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) },
                                ].filter(r => r.value).map(({ label, value }) => (
                                  <div key={label} className="bg-white rounded-xl border border-hazel-cream px-3 py-2.5">
                                    <p className="text-xs text-hazel-muted/60 mb-0.5">{label}</p>
                                    <p className="text-sm font-medium text-hazel-green capitalize">{value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {sub ? (
                              <div>
                                <p className="text-[10px] font-medium text-hazel-muted/60 uppercase tracking-widest mb-3">Intake form — completed</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {[
                                    { label: 'Date of birth', value: sub.date_of_birth },
                                    { label: 'Skin type', value: sub.skin_type },
                                    { label: 'Fitzpatrick scale', value: sub.fitzpatrick_scale ? `Type ${sub.fitzpatrick_scale}` : null },
                                    { label: 'Primary concern', value: sub.primary_concern },
                                    { label: 'Duration', value: sub.concern_duration },
                                    { label: 'Allergies', value: sub.allergies },
                                    { label: 'Medications', value: sub.current_medications },
                                    { label: 'GP', value: sub.gp_name },
                                    { label: 'GP address', value: sub.gp_address },
                                  ].filter(r => r.value).map(({ label, value }) => (
                                    <div key={label} className="bg-white rounded-xl border border-hazel-cream px-3 py-2.5">
                                      <p className="text-xs text-hazel-muted/60 mb-0.5">{label}</p>
                                      <p className="text-sm text-hazel-green capitalize">{value}</p>
                                    </div>
                                  ))}
                                </div>
                                {(sub.current_skincare_routine || sub.previous_treatments) && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                    {sub.current_skincare_routine && (
                                      <div className="bg-white rounded-xl border border-hazel-cream px-3 py-2.5">
                                        <p className="text-xs text-hazel-muted/60 mb-1">Current skincare routine</p>
                                        <p className="text-sm text-hazel-green whitespace-pre-wrap">{sub.current_skincare_routine}</p>
                                      </div>
                                    )}
                                    {sub.previous_treatments && (
                                      <div className="bg-white rounded-xl border border-hazel-cream px-3 py-2.5">
                                        <p className="text-xs text-hazel-muted/60 mb-1">Previous treatments</p>
                                        <p className="text-sm text-hazel-green whitespace-pre-wrap">{sub.previous_treatments}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {sub.photo_urls?.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-xs text-hazel-muted/60 mb-2">Skin photos</p>
                                    <div className="flex gap-2 flex-wrap">
                                      {sub.photo_urls.map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noreferrer">
                                          <img src={url} alt={`Skin photo ${i + 1}`} className="w-20 h-20 rounded-xl object-cover border border-hazel-cream hover:opacity-80 transition-opacity" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : booking.intake_complete ? (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-pulse">
                                {[...Array(6)].map((_, i) => (
                                  <div key={i} className="bg-hazel-cream/40 rounded-xl h-14" />
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-hazel-muted/50 italic">Intake form not yet completed by patient.</p>
                            )}

                            {booking.passport_linked && (
                              <div className="flex items-center gap-2 bg-hazel-mint/50 border border-hazel-sage/20 rounded-xl px-4 py-3">
                                <LeafIcon className="w-4 h-4 text-hazel-sage shrink-0" />
                                <span className="text-sm text-hazel-green font-medium">Companion linked via hazel</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 px-5 text-center text-hazel-muted/40 text-xs">
                    Call or message hazel above to create a live booking — it will appear here instantly.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="border-t border-hazel-cream py-10 text-center">
        <p className="hazel-wordmark text-hazel-green/60 text-base mb-1">hazel</p>
        <p className="text-xs text-hazel-muted/40">The voice of exceptional care · available 24 / 7</p>
      </footer>
    </div>
  )
}
