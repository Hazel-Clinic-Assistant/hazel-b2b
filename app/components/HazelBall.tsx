'use client'

import { useEffect, useRef, useState } from 'react'

type BallState = 'entering' | 'orbiting' | 'connecting' | 'speaking' | 'done'

function LeafIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

export function HazelBall() {
  const [state, setState] = useState<BallState>('entering')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null)

  useEffect(() => {
    const t = setTimeout(() => setState('orbiting'), 1600)
    return () => clearTimeout(t)
  }, [])

  const handleClick = async () => {
    if (state !== 'orbiting' && state !== 'done') return
    setState('connecting')
    try {
      const { default: Vapi } = await import('@vapi-ai/web')
      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!)
      vapiRef.current = vapi

      vapi.on('call-start', () => setState('speaking'))

      vapi.on('speech-end', () => {
        setTimeout(() => vapiRef.current?.stop(), 700)
      })

      vapi.on('call-end', () => {
        setState('done')
        vapiRef.current = null
      })

      vapi.on('error', () => {
        setState('orbiting')
        vapiRef.current = null
      })

      await vapi.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!, {
        firstMessage: "Hello! I'm Hazel — your clinic's always-on virtual assistant. I handle bookings, patient intake, and follow-up care so your team can focus on what matters most.",
      })
    } catch {
      setState('orbiting')
    }
  }

  const isClickable = state === 'orbiting' || state === 'done'

  return (
    <>
      <style>{`
        @keyframes ball-enter {
          0%   { transform: translateY(-280px) scale(0.3); opacity: 0; }
          55%  { transform: translateY(16px) scale(1.04); opacity: 1; }
          75%  { transform: translateY(-8px) scale(0.97); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes ball-orbit {
          0%   { transform: translateX(0px)   translateY(0px); }
          25%  { transform: translateX(36px)  translateY(-16px); }
          50%  { transform: translateX(0px)   translateY(-28px); }
          75%  { transform: translateX(-36px) translateY(-16px); }
          100% { transform: translateX(0px)   translateY(0px); }
        }
        @keyframes ring-idle {
          0%   { transform: scale(1); opacity: 0.35; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes ring-speak {
          0%   { transform: scale(1); opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes ball-breathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.07); }
        }
        @keyframes click-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-5px); }
        }
        @keyframes click-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>

      <div className="flex flex-col items-center gap-5 select-none">
        <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>

          {/* Idle ambient ring — always visible in orbiting/done state */}
          {(state === 'orbiting' || state === 'done') && (
            <>
              <span className="absolute inset-0 rounded-full bg-hazel-sage/20" style={{ animation: 'ring-idle 2.2s ease-out infinite' }} />
              <span className="absolute inset-0 rounded-full bg-hazel-sage/12" style={{ animation: 'ring-idle 2.2s ease-out 1.1s infinite' }} />
            </>
          )}

          {/* Speaking rings */}
          {state === 'speaking' && (
            <>
              <span className="absolute inset-0 rounded-full bg-hazel-sage/30" style={{ animation: 'ring-speak 1.3s ease-out infinite' }} />
              <span className="absolute inset-0 rounded-full bg-hazel-sage/22" style={{ animation: 'ring-speak 1.3s ease-out 0.43s infinite' }} />
              <span className="absolute inset-0 rounded-full bg-hazel-sage/14" style={{ animation: 'ring-speak 1.3s ease-out 0.86s infinite' }} />
            </>
          )}

          {/* The ball */}
          <button
            onClick={handleClick}
            disabled={!isClickable}
            aria-label="Click to hear Hazel introduce herself"
            className="relative rounded-full flex items-center justify-center focus:outline-none group"
            style={{
              width: 200,
              height: 200,
              background: 'radial-gradient(circle at 38% 32%, #c9dcc4, #A7B8A0 42%, #5a7055 72%, #2B2624)',
              boxShadow: state === 'speaking'
                ? '0 0 0 8px rgba(167,184,160,0.18), 0 0 60px rgba(167,184,160,0.35), 0 20px 50px rgba(0,0,0,0.5)'
                : (state === 'orbiting' || state === 'done')
                ? '0 0 50px rgba(167,184,160,0.22), 0 16px 48px rgba(0,0,0,0.45)'
                : '0 12px 40px rgba(0,0,0,0.4)',
              animation: state === 'entering'
                ? 'ball-enter 1.6s cubic-bezier(0.34,1.56,0.64,1) forwards'
                : state === 'speaking'
                ? 'ball-orbit 5s ease-in-out infinite, ball-breathe 0.85s ease-in-out infinite'
                : (state === 'orbiting' || state === 'done')
                ? 'ball-orbit 5s ease-in-out infinite'
                : 'none',
              cursor: isClickable ? 'pointer' : 'default',
              transition: 'box-shadow 0.4s',
            }}
          >
            {/* Specular highlight */}
            <span className="absolute rounded-full pointer-events-none" style={{ inset: 10, background: 'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.22), transparent 60%)' }} />

            {/* Icon */}
            <span className="relative text-hazel-cream/90 group-hover:text-white transition-colors duration-200">
              <LeafIcon />
            </span>

            {/* Connecting spinner overlay */}
            {state === 'connecting' && (
              <span className="absolute inset-0 rounded-full border-4 border-hazel-cream/20 border-t-hazel-cream animate-spin" />
            )}
          </button>
        </div>

        {/* Click label — prominent in orbiting state */}
        <div className="flex flex-col items-center gap-1.5">
          {state === 'orbiting' && (
            <>
              <span
                className="text-hazel-cream text-base font-medium tracking-wide"
                style={{ animation: 'click-pulse 2s ease-in-out infinite' }}
              >
                Click to meet Hazel
              </span>
              <span
                className="text-hazel-sage text-xl"
                style={{ animation: 'click-bounce 1.4s ease-in-out infinite' }}
              >
                ↑
              </span>
            </>
          )}
          {state === 'connecting' && (
            <p className="text-hazel-cream/50 text-sm">connecting…</p>
          )}
          {state === 'speaking' && (
            <p className="text-hazel-sage text-sm font-medium tracking-wide" style={{ animation: 'click-pulse 1.5s ease-in-out infinite' }}>
              hazel is speaking
            </p>
          )}
          {state === 'done' && (
            <p className="text-hazel-cream/40 text-sm">click to hear again</p>
          )}
          {state === 'entering' && (
            <div style={{ height: 28 }} />
          )}
        </div>
      </div>
    </>
  )
}
