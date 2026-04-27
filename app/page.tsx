'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HazelBall } from './components/HazelBall'

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

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-5 h-5'}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  )
}

function PillIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-5 h-5'}>
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </svg>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-5 h-5'}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-5 h-5'}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-5 h-5'}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

const LIFECYCLE_STAGES = [
  {
    step: '01',
    icon: PhoneIcon,
    title: 'Booking & reception',
    body: 'Hazel answers calls and WhatsApp messages 24/7 — collecting patient details, understanding their concern, and booking the right slot. No missed calls. No hold music. No after-hours gap.',
  },
  {
    step: '02',
    icon: BellIcon,
    title: 'Pre-visit follow-up',
    body: 'Hazel sends personalised reminders before each appointment, along with preparation instructions tailored to the treatment. Patients arrive ready. Cancellations drop.',
  },
  {
    step: '03',
    icon: ClipboardIcon,
    title: 'Complete patient intake',
    body: 'After booking, Hazel sends a digital intake form via WhatsApp. By the time your patient walks in, your team has their full medical history, skin type, concerns, medications, and photos — without a single paper form.',
  },
  {
    step: '04',
    icon: PillIcon,
    title: 'Post-consultation care',
    body: 'Hazel follows up automatically after each visit — sending medication schedules, aftercare instructions, and check-in messages. Patients feel supported. Compliance improves. Reviews follow.',
  },
  {
    step: '05',
    icon: CameraIcon,
    title: 'AI photo check-ins',
    body: 'Patients submit progress photos at regular intervals through Hazel. The AI analyses improvement, tracks results over time, and flags cases that may need clinical attention — giving your team visibility between visits.',
  },
  {
    step: '06',
    icon: RefreshIcon,
    title: 'Lifelong patient relationship',
    body: 'Hazel prompts rebooking at the right moment, celebrates patient milestones, and keeps the relationship warm between visits. One-time appointments become long-term retention.',
  },
]

const PAIN_POINTS = [
  { before: 'Calls go to voicemail after hours', after: 'Hazel answers every call, 24/7' },
  { before: 'Paper intake forms before appointments', after: 'Digital intake collected automatically via WhatsApp' },
  { before: 'Manual follow-up calls after consultations', after: 'Automated care reminders and check-ins' },
  { before: 'No visibility between appointments', after: 'AI photo tracking and progress reports' },
  { before: 'Patients fall off after one visit', after: 'Structured lifecycle keeps every patient engaged' },
]

export default function LandingPage() {
  const router = useRouter()
  const formRef = useRef<HTMLDivElement>(null)

  const [clinicName, setClinicName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const [submitting, setSubmitting] = useState(false)

  const handleOpenDemo = async () => {
    if (!formComplete || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicName: clinicName.trim(),
          contactName: contactName.trim(),
          email: email.trim(),
        }),
      })
    } catch {
      // silently continue — don't block the user if the save fails
    }
    router.push('/demo')
  }

  const formComplete = clinicName.trim().length > 0 && contactName.trim().length > 0 && email.trim().length > 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1e1c1a' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 z-50 border-b" style={{ backgroundColor: '#1e1c1a', borderColor: 'rgba(231,222,211,0.08)' }}>
        <div className="flex items-center gap-2">
          <LeafIcon className="w-4 h-4 text-hazel-sage" />
          <span className="hazel-wordmark text-hazel-cream text-xl">hazel</span>
        </div>
        <button
          onClick={scrollToForm}
          className="text-sm px-5 py-2 rounded-full font-medium transition-colors"
          style={{ backgroundColor: 'rgba(167,184,160,0.15)', color: '#A7B8A0', border: '1px solid rgba(167,184,160,0.25)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(167,184,160,0.25)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(167,184,160,0.15)' }}
        >
          Get started
        </button>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="px-6 pt-16 pb-24 text-center max-w-4xl mx-auto">

        {/* Hazel ball — the hero element */}
        <div className="flex justify-center mb-10">
          <HazelBall />
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full mb-8" style={{ backgroundColor: 'rgba(167,184,160,0.12)', color: '#A7B8A0', border: '1px solid rgba(167,184,160,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-hazel-sage animate-pulse" />
          Built for skin clinics · End-to-end patient lifecycle
        </div>

        <h1 className="hazel-wordmark font-light text-5xl md:text-6xl lg:text-7xl tracking-tight leading-tight mb-6" style={{ color: '#E7DED3' }}>
          From first call<br className="hidden sm:block" /> to lifelong patient.
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10" style={{ color: 'rgba(231,222,211,0.55)' }}>
          Hazel is the complete patient management system for skin clinics — handling everything from the first booking call to long-term follow-up, automatically.
        </p>

        <div className="flex items-center justify-center">
          <button
            onClick={scrollToForm}
            className="text-base px-10 py-3.5 rounded-full font-medium transition-colors"
            style={{ backgroundColor: '#A7B8A0', color: '#1e1c1a' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#c8dbc3' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#A7B8A0' }}
          >
            Get started →
          </button>
        </div>
      </section>

      {/* ── Pain points ──────────────────────────────────────────────────── */}
      <section className="px-6 py-16 border-y" style={{ backgroundColor: '#2B2624', borderColor: 'rgba(231,222,211,0.07)' }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs uppercase tracking-[0.2em] mb-10" style={{ color: 'rgba(167,184,160,0.5)' }}>
            The gap Hazel fills
          </p>
          <div className="space-y-3">
            {PAIN_POINTS.map(({ before, after }) => (
              <div key={before} className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(231,222,211,0.08)' }}>
                <div className="px-5 py-4 flex items-center gap-3" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                  <span className="text-lg leading-none shrink-0" style={{ color: 'rgba(231,222,211,0.2)' }}>✕</span>
                  <p className="text-sm" style={{ color: 'rgba(231,222,211,0.45)' }}>{before}</p>
                </div>
                <div className="px-5 py-4 flex items-center gap-3 border-t md:border-t-0 md:border-l" style={{ backgroundColor: 'rgba(167,184,160,0.08)', borderColor: 'rgba(167,184,160,0.12)' }}>
                  <span className="text-hazel-sage text-lg leading-none shrink-0">✓</span>
                  <p className="text-sm font-medium" style={{ color: '#E7DED3' }}>{after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Lifecycle ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-20" style={{ backgroundColor: '#1e1c1a' }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-xs text-center uppercase tracking-[0.2em] mb-3" style={{ color: 'rgba(167,184,160,0.45)' }}>
            The full patient lifecycle
          </p>
          <h2 className="hazel-wordmark font-light text-3xl md:text-4xl text-center tracking-tight mb-14" style={{ color: '#E7DED3' }}>
            Every touchpoint. Handled.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {LIFECYCLE_STAGES.map(({ step, icon: Icon, title, body }) => (
              <div
                key={step}
                className="rounded-2xl p-6 transition-all"
                style={{ backgroundColor: '#2B2624', border: '1px solid rgba(231,222,211,0.08)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(167,184,160,0.25)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(231,222,211,0.08)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(167,184,160,0.12)' }}>
                    <Icon className="w-5 h-5 text-hazel-sage" />
                  </div>
                  <span className="text-3xl font-thin leading-none tabular-nums" style={{ color: 'rgba(167,184,160,0.18)' }}>{step}</span>
                </div>
                <h3 className="font-medium mb-2 leading-snug capitalize" style={{ color: '#E7DED3' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(231,222,211,0.45)' }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works for you ─────────────────────────────────────────── */}
      <section className="px-6 py-16 border-t" style={{ backgroundColor: '#2B2624', borderColor: 'rgba(231,222,211,0.07)' }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-center uppercase tracking-[0.2em] mb-14" style={{ color: 'rgba(167,184,160,0.45)' }}>
            Getting started
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { step: '01', title: 'Connect your clinic', body: 'Enter your clinic details and we set up Hazel with your services, team, and availability. Takes minutes, not days.' },
              { step: '02', title: 'Activate your channels', body: 'Hazel connects to your WhatsApp number and phone line. Patients reach Hazel through the same channels they already use.' },
              { step: '03', title: 'Hazel runs the rest', body: 'From the first patient message to the follow-up six months later — Hazel handles every touchpoint while you focus on delivering exceptional care.' },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-5">
                <span className="text-4xl font-thin leading-none shrink-0 tabular-nums" style={{ color: 'rgba(167,184,160,0.2)' }}>{step}</span>
                <div className="pt-1">
                  <h4 className="font-medium mb-2 leading-snug" style={{ color: '#E7DED3' }}>{title}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(231,222,211,0.45)' }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Get started form ─────────────────────────────────────────────── */}
      <section ref={formRef} className="px-6 py-24" style={{ backgroundColor: '#1e1c1a' }}>
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-5">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(167,184,160,0.12)' }}>
                <LeafIcon className="w-5 h-5 text-hazel-sage" />
              </div>
            </div>
            <h2 className="hazel-wordmark font-light text-3xl md:text-4xl tracking-tight mb-3" style={{ color: '#E7DED3' }}>
              See Hazel in action
            </h2>
            <p className="text-base leading-relaxed" style={{ color: 'rgba(231,222,211,0.5)' }}>
              Enter your clinic details to open a live demo — no setup required.
            </p>
          </div>

          <div className="rounded-2xl p-8 space-y-4" style={{ backgroundColor: '#2B2624', border: '1px solid rgba(231,222,211,0.1)' }}>
            {(['Clinic name', 'Your name', 'Email address'] as const).map((label) => {
              const isEmail = label === 'Email address'
              const value = label === 'Clinic name' ? clinicName : label === 'Your name' ? contactName : email
              const setter = label === 'Clinic name' ? setClinicName : label === 'Your name' ? setContactName : setEmail
              const placeholder = label === 'Clinic name' ? 'e.g. Harley Street Skin Clinic' : label === 'Your name' ? 'e.g. Dr. Sarah Collins' : 'you@yourclinic.com'
              return (
                <div key={label}>
                  <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(167,184,160,0.6)' }}>{label}</label>
                  <input
                    type={isEmail ? 'email' : 'text'}
                    value={value}
                    onChange={e => setter(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && formComplete && handleOpenDemo()}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-xl text-sm transition-colors focus:outline-none"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(231,222,211,0.12)',
                      color: '#E7DED3',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(167,184,160,0.5)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(231,222,211,0.12)' }}
                  />
                </div>
              )
            })}

            <div className="pt-2">
              <button
                onClick={handleOpenDemo}
                disabled={!formComplete || submitting}
                className="w-full py-4 text-base rounded-full font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  backgroundColor: formComplete ? '#A7B8A0' : 'rgba(167,184,160,0.2)',
                  color: formComplete ? '#1e1c1a' : 'rgba(167,184,160,0.4)',
                  cursor: formComplete && !submitting ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                    Saving…
                  </>
                ) : 'Open demo →'}
              </button>
              {!formComplete && (
                <p className="text-xs text-center mt-3" style={{ color: 'rgba(231,222,211,0.25)' }}>Fill in all fields to continue</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="py-10 text-center border-t" style={{ borderColor: 'rgba(231,222,211,0.07)' }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <LeafIcon className="w-3.5 h-3.5 text-hazel-sage" />
          <span className="hazel-wordmark text-base" style={{ color: 'rgba(231,222,211,0.35)' }}>hazel</span>
        </div>
        <p className="text-xs" style={{ color: 'rgba(231,222,211,0.2)' }}>The voice of exceptional care · available 24 / 7</p>
      </footer>

    </div>
  )
}
