'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  onTranscript: (text: string) => void
  className?: string
}

export function SpeechInputButton({ onTranscript, className }: Props) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [denied, setDenied] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
    )
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) return
    setDenied(false)
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = navigator.language || 'en-GB'

    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .filter((r: any) => r.isFinal)
        .map((r: any) => r[0].transcript)
        .join(' ')
      if (transcript.trim()) onTranscript(transcript.trim())
    }
    rec.onend = () => setListening(false)
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed') setDenied(true)
      setListening(false)
    }

    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }, [onTranscript])

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      title={
        denied
          ? 'Microphone access denied'
          : listening
            ? 'Stop recording'
            : 'Fill with speech'
      }
      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all shrink-0 ${
        denied
          ? 'bg-orange-50 text-orange-400'
          : listening
            ? 'bg-red-50 text-red-500 hover:bg-red-100 animate-pulse'
            : 'bg-hazel-cream/60 text-hazel-muted hover:bg-hazel-cream hover:text-hazel-green'
      } ${className ?? ''}`}
    >
      {listening ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-3.5 h-3.5"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      )}
    </button>
  )
}
