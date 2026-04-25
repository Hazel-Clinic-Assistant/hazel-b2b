'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'

const CLINIC_ID = 'demo-clinic'
const CLINIC_NAME = 'Hazel Demo Clinic'

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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className ?? 'w-4 h-4'}
    >
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 5.5-11.5 7.5L8 9.5C8 9.5 14 7 17 8z" />
    </svg>
  )
}

function WhatsAppPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    pending: 'pill-pending',
    sent: 'pill-sent',
    delivered: 'pill-delivered',
    failed: 'pill-failed',
  }
  return (
    <span className={cls[status] ?? 'pill-pending'}>
      {status}
    </span>
  )
}

export default function HomePage() {
  const [isCallActive, setIsCallActive] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null)

  const loadBookings = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('clinic_id', CLINIC_ID)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setBookings(data)
  }, [])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  useEffect(() => {
    const supabase = createBrowserClient()
    const channel = supabase
      .channel('demo-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `clinic_id=eq.${CLINIC_ID}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBookings((prev) => [payload.new as Booking, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setBookings((prev) =>
              prev.map((b) => (b.id === payload.new.id ? (payload.new as Booking) : b))
            )
          } else if (payload.eventType === 'DELETE') {
            setBookings((prev) => prev.filter((b) => b.id !== (payload.old as Booking).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleCallToggle = async () => {
    if (isCallActive) {
      vapiRef.current?.stop()
      return
    }

    setIsConnecting(true)
    try {
      const { default: Vapi } = await import('@vapi-ai/web')
      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!)
      vapiRef.current = vapi

      vapi.on('call-start', () => {
        setIsCallActive(true)
        setIsConnecting(false)
      })
      vapi.on('call-end', () => {
        setIsCallActive(false)
        setIsConnecting(false)
        vapiRef.current = null
      })
      vapi.on('error', (err: unknown) => {
        console.error('[Vapi]', err)
        setIsCallActive(false)
        setIsConnecting(false)
      })

      await vapi.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!, {
        voice: {
          provider: '11labs',
          voiceId: 'XB0fDUnXU5powFXDhCwa', // Charlotte — British female
        },
        firstMessage: "Hi there, thanks for calling Hazel! How can I help you today?",
      })
    } catch (err) {
      console.error('[Vapi] init error', err)
      setIsConnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F3]">
      {/* Header */}
      <header className="bg-[#1C3A2E] px-8 py-6 flex items-center justify-between">
        <div>
          <h1 className="hazel-wordmark text-[#E8D5B0] text-3xl">Hazel</h1>
          <p className="text-[#E8D5B0]/60 text-sm mt-0.5">{CLINIC_NAME}</p>
        </div>
        <div className="flex items-center gap-2">
          <LeafIcon className="w-5 h-5 text-[#E8D5B0]/40" />
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-8 pt-20 pb-12 text-center">
        <div className="flex justify-center mb-6">
          <LeafIcon className="w-10 h-10 text-hazel-sage" />
        </div>
        <h2 className="hazel-wordmark text-[#1C3A2E] text-5xl mb-4 leading-tight">
          Your AI Skin Receptionist
        </h2>
        <p className="text-hazel-muted text-lg mb-12 max-w-xl mx-auto">
          Hazel handles bookings, intake, and patient onboarding — so your clinicians can focus on
          the skin.
        </p>

        <button
          onClick={handleCallToggle}
          disabled={isConnecting}
          className={`px-14 py-5 rounded-full text-xl font-medium tracking-wide transition-all shadow-lg ${
            isCallActive
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'
              : isConnecting
              ? 'bg-hazel-green/60 text-hazel-cream cursor-not-allowed'
              : 'bg-[#1C3A2E] text-[#E8D5B0] hover:bg-[#2A4A3C] shadow-hazel-green/20 hover:shadow-xl'
          }`}
        >
          {isConnecting ? 'Connecting…' : isCallActive ? 'End Call' : 'Call Hazel'}
        </button>

        {isCallActive && (
          <p className="mt-4 text-hazel-muted text-sm animate-pulse">
            Hazel is listening — speak naturally to book your appointment
          </p>
        )}
      </section>

      {/* Live bookings table */}
      <section className="max-w-5xl mx-auto px-8 pb-20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-hazel-green font-medium text-sm uppercase tracking-widest">
            Live Bookings
          </h3>
          <span className="flex items-center gap-1.5 text-xs text-hazel-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Realtime
          </span>
        </div>

        <div className="rounded-2xl border border-hazel-cream bg-white overflow-hidden shadow-sm">
          {bookings.length === 0 ? (
            <div className="py-16 text-center text-hazel-muted text-sm">
              No bookings yet — call Hazel to create one.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hazel-cream bg-[#FAF8F3]">
                  <th className="text-left px-5 py-3 text-hazel-muted font-medium text-xs uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="text-left px-5 py-3 text-hazel-muted font-medium text-xs uppercase tracking-wider">
                    Concern
                  </th>
                  <th className="text-left px-5 py-3 text-hazel-muted font-medium text-xs uppercase tracking-wider">
                    Slot
                  </th>
                  <th className="text-left px-5 py-3 text-hazel-muted font-medium text-xs uppercase tracking-wider">
                    WhatsApp
                  </th>
                  <th className="text-left px-5 py-3 text-hazel-muted font-medium text-xs uppercase tracking-wider">
                    Passport
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hazel-cream/50">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-[#FAF8F3]/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-hazel-green">
                      {booking.patient_name}
                    </td>
                    <td className="px-5 py-3.5 text-hazel-muted capitalize">
                      {booking.skin_concern}
                    </td>
                    <td className="px-5 py-3.5 text-hazel-muted">{booking.preferred_slot}</td>
                    <td className="px-5 py-3.5">
                      <WhatsAppPill status={booking.whatsapp_status} />
                    </td>
                    <td className="px-5 py-3.5">
                      {booking.passport_linked ? (
                        <LeafIcon className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <span className="text-gray-300 text-lg leading-none">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <footer className="border-t border-hazel-cream py-6 text-center text-xs text-hazel-muted/60">
        Hazel · AI Receptionist for Skin Clinics
      </footer>
    </div>
  )
}
