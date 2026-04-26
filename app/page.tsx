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

  // Shared name + phone
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // Call states
  const [callbackState, setCallbackState] = useState<CallbackState>('idle')
  const [vapiState, setVapiState] = useState<VapiState>('idle')

  const [bookings, setBookings] = useState<Booking[]>([])
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

  // The active clinic — custom if loaded, otherwise HSSC default
  const activeClinic: ClinicData = clinicData ?? DEFAULT_CLINIC

  const loadBookings = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from('bookings').select('*').eq('clinic_id', DEMO_CLINIC_ID)
      .order('created_at', { ascending: false }).limit(20)
    if (data) setBookings(data)
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

  const waLink = name.trim()
    ? `https://wa.me/14155238886?text=${encodeURIComponent(`Hi, I'm ${name.trim()}`)}`
    : 'https://wa.me/14155238886?text=Hi'

  return (
    <div className="min-h-screen bg-hazel-off-white">
      <NavHeader subtitle={activeClinic.name} />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-14 pb-8 text-center">
        {/* 24/7 badge */}
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Available 24/7 · responds in seconds
        </div>

        <h2 className="hazel-wordmark font-bold text-hazel-green text-5xl mb-4 leading-tight">
          Every patient, perfectly prepared.
        </h2>
        <p className="text-hazel-muted text-lg mb-3 max-w-xl mx-auto">
          hazel is your always-on AI receptionist — booking consultations, collecting intake, and delivering a full patient profile before they walk in the door.
        </p>

        {/* Clinic setup input */}
        <div className="max-w-xl mx-auto mt-8 mb-4">
          {setupState === 'done' && clinicData ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-emerald-500 mt-0.5 text-lg">✓</span>
                  <div>
                    <p className="font-semibold text-emerald-800">{clinicData.name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      {clinicData.address && <p className="text-xs text-emerald-700">📍 {clinicData.address}</p>}
                      {clinicData.hours && <p className="text-xs text-emerald-700">🕐 {clinicData.hours}</p>}
                      {clinicData.doctors.length > 0 && (
                        <p className="text-xs text-emerald-700">👨‍⚕️ {clinicData.doctors.slice(0, 3).join(', ')}{clinicData.doctors.length > 3 ? ` +${clinicData.doctors.length - 3} more` : ''}</p>
                      )}
                      {clinicData.treatments.length > 0 && (
                        <p className="text-xs text-emerald-700">💉 {clinicData.treatments.slice(0, 4).join(', ')}{clinicData.treatments.length > 4 ? '…' : ''}</p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setClinicData(null); setSetupState('idle'); setClinicUrl('') }}
                  className="text-xs text-emerald-600 underline underline-offset-2 shrink-0 mt-0.5"
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
                <p className="text-xs text-hazel-muted/70 text-center animate-pulse">
                  Reading your clinic website and extracting doctors, treatments & hours…
                </p>
              )}
              {setupState === 'error' && (
                <p className="text-xs text-red-500 text-center">{setupError}</p>
              )}
              {setupState === 'idle' && (
                <p className="text-xs text-hazel-muted/60 text-center">
                  Or scroll down to try the live demo with Harley Street Skin Clinic ↓
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Demo section */}
      <section className="max-w-5xl mx-auto px-8 pb-6">
        {/* Clinic label when using HSSC default */}
        {!clinicData && (
          <p className="text-center text-xs text-hazel-muted/60 uppercase tracking-widest mb-6">
            Live demo · Harley Street Skin Clinic
          </p>
        )}

        {/* Address + hours line */}
        <p className="text-hazel-muted/60 text-sm text-center mb-8">
          {activeClinic.address && `${activeClinic.address}`}
          {activeClinic.address && activeClinic.hours && ' · '}
          {activeClinic.hours}
        </p>

        {/* Shared name field */}
        <div className="max-w-xs mx-auto mb-6">
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
            <p className="text-xs text-hazel-muted/50 text-center mt-2">Enter your name to get started</p>
          )}
        </div>

        {/* 3-card CTA grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">

          {/* Card 1: WhatsApp */}
          <div className="bg-white rounded-2xl border border-hazel-cream px-7 py-7 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
              <p className="text-sm font-medium text-hazel-green">chat with hazel</p>
            </div>
            <p className="text-hazel-muted text-sm mb-6 flex-1">
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
                className="w-full inline-flex items-center justify-center bg-hazel-cream text-hazel-muted/60 py-3 rounded-full font-medium text-sm hover:bg-hazel-cream/80 transition-colors"
              >
                Enter your name first ↑
              </button>
            )}
          </div>

          {/* Card 2: Browser call */}
          <div className="bg-white rounded-2xl border border-hazel-cream px-7 py-7 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <PhoneIcon className="w-5 h-5 text-hazel-sage" />
              <p className="text-sm font-medium text-hazel-green">call hazel here</p>
            </div>

            {vapiState === 'idle' && (
              <>
                <p className="text-hazel-muted text-sm mb-6 flex-1">
                  Talk to hazel live in your browser — no phone number needed. Just click and speak.
                </p>
                {hasName ? (
                  <button onClick={handleBrowserCall} className="w-full bg-hazel-green text-hazel-cream py-3 rounded-full font-medium hover:bg-hazel-green-light transition-colors text-sm">
                    Talk to hazel →
                  </button>
                ) : (
                  <button onClick={focusName} className="w-full bg-hazel-cream text-hazel-muted/60 py-3 rounded-full font-medium text-sm hover:bg-hazel-cream/80 transition-colors">
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
                    <span className="absolute w-12 h-12 rounded-full bg-emerald-100 animate-ping opacity-50" />
                    <span className="relative w-8 h-8 rounded-full bg-emerald-400 flex items-center justify-center">
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
                  <LeafIcon className="w-8 h-8 text-hazel-sage" />
                  <p className="text-sm font-medium text-hazel-green">Call ended</p>
                  <p className="text-xs text-hazel-muted text-center">Your booking will appear in the live table below.</p>
                </div>
                <button onClick={() => setVapiState('idle')} className="w-full border border-hazel-green text-hazel-green py-3 rounded-full font-medium hover:bg-hazel-green hover:text-hazel-cream transition-colors text-sm">
                  Call again
                </button>
              </>
            )}
          </div>

          {/* Card 3: Callback */}
          <div className="bg-white rounded-2xl border border-hazel-cream px-7 py-7 shadow-sm flex flex-col">
            {callbackState === 'confirmed' ? (
              <>
                <div className="flex-1 flex flex-col items-center justify-center py-4 gap-2">
                  <LeafIcon className="w-8 h-8 text-hazel-sage" />
                  <p className="text-sm font-medium text-hazel-green">{name ? `Calling ${name} now` : 'Calling you now'}</p>
                  <p className="text-xs text-hazel-muted text-center">Expect a call on {phone} within 30 seconds.</p>
                </div>
                <button onClick={() => { setCallbackState('idle'); setPhone('') }} className="text-xs text-hazel-muted/60 underline underline-offset-2">
                  Use a different number
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <PhoneIcon className="w-5 h-5 text-hazel-sage" />
                  <p className="text-sm font-medium text-hazel-green">get a call back</p>
                </div>
                <p className="text-hazel-muted text-sm mb-4 flex-1">
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
                  <button onClick={focusName} className="w-full bg-hazel-cream text-hazel-muted/60 py-3 rounded-full font-medium text-sm hover:bg-hazel-cream/80 transition-colors">
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
      </section>

      {/* Platform navigation strip */}
      <section className="max-w-5xl mx-auto px-8 pb-12 pt-4">
        <p className="text-xs text-hazel-muted/50 text-center uppercase tracking-widest mb-4">Explore the full platform</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'clinic dashboard', desc: 'Live bookings, intake & companion', href: '/dashboard', external: false },
            { label: 'intake form', desc: 'Patient pre-appointment questionnaire', href: '/intake?demo=true', external: false },
            { label: 'hazel companion', desc: 'Patient continuity & skin tracking', href: 'https://hazelskincoach.vercel.app/patient/onboarding', external: true },
          ].map(({ label, desc, href, external }) => (
            <a key={label} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
              className="bg-white rounded-2xl border border-hazel-cream p-4 hover:border-hazel-green/40 hover:shadow-sm transition-all group">
              <p className="text-sm font-medium text-hazel-green mb-0.5">
                {label}{external && <span className="ml-1 text-hazel-muted/50 text-xs">↗</span>}
              </p>
              <p className="text-xs text-hazel-muted/70">{desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-8 pb-16">
        <h3 className="text-center text-hazel-green font-medium text-sm uppercase tracking-widest mb-8">How hazel works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Patient reaches out — any time', body: 'They text on WhatsApp, call live in the browser, or enter their number for a callback. hazel responds instantly, 24 hours a day, 7 days a week.' },
            { step: '02', title: 'hazel books & preps', body: 'During the AI call, hazel collects name, skin concern, urgency and preferred slot — then sends a WhatsApp confirmation with an intake link.' },
            { step: '03', title: 'Clinic arrives informed', body: "The patient's full skin intake, photos, and companion history arrive on the dashboard before the appointment. No paperwork, no surprises." },
          ].map(({ step, title, body }) => (
            <div key={step} className="bg-white rounded-2xl border border-hazel-cream p-6 shadow-sm">
              <span className="text-xs font-semibold text-hazel-sage tracking-widest">{step}</span>
              <h4 className="font-semibold text-hazel-green mt-2 mb-2">{title}</h4>
              <p className="text-sm text-hazel-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live bookings table */}
      <section className="max-w-5xl mx-auto px-8 pb-20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-hazel-green font-medium text-sm uppercase tracking-widest">Live Bookings</h3>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-hazel-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Realtime
            </span>
            <a href="/dashboard" className="text-xs text-hazel-green border border-hazel-green/30 px-3 py-1 rounded-full hover:bg-hazel-green hover:text-hazel-cream transition-colors">
              Full dashboard →
            </a>
          </div>
        </div>
        <div className="rounded-2xl border border-hazel-cream bg-white overflow-hidden shadow-sm">
          {bookings.length === 0 ? (
            <div className="py-16 text-center text-hazel-muted text-sm">
              No bookings yet — request a callback or chat on WhatsApp to create one.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hazel-cream bg-hazel-off-white">
                  {['Patient', 'Concern', 'Slot', 'WhatsApp', 'Companion'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-hazel-muted font-medium text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hazel-cream/50">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-hazel-off-white/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-hazel-green">{booking.patient_name}</td>
                    <td className="px-5 py-3.5 text-hazel-muted capitalize">{booking.skin_concern}</td>
                    <td className="px-5 py-3.5 text-hazel-muted">{booking.preferred_slot}</td>
                    <td className="px-5 py-3.5"><WhatsAppPill status={booking.whatsapp_status} /></td>
                    <td className="px-5 py-3.5">
                      {booking.passport_linked ? <LeafIcon className="w-4 h-4 text-emerald-600" /> : <span className="text-gray-300 text-lg leading-none">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <footer className="border-t border-hazel-cream py-6 text-center text-xs text-hazel-muted/60">
        hazel · AI receptionist for skin clinics · available 24/7
      </footer>
    </div>
  )
}
