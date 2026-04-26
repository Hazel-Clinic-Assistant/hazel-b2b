'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { NavHeader } from '@/app/components/NavHeader'
import { SpeechInputButton } from '@/app/components/SpeechInputButton'
import { CameraCapture } from '@/app/components/CameraCapture'

const SKIN_TYPES = ['oily', 'dry', 'combination', 'normal', 'sensitive'] as const
type SkinType = (typeof SKIN_TYPES)[number]

const FITZPATRICK = [
  { level: 1, label: 'Type I', description: 'Very fair · Always burns, never tans' },
  { level: 2, label: 'Type II', description: 'Fair · Usually burns, sometimes tans' },
  { level: 3, label: 'Type III', description: 'Medium · Sometimes burns, always tans' },
  { level: 4, label: 'Type IV', description: 'Olive · Rarely burns, easily tans' },
  { level: 5, label: 'Type V', description: 'Brown · Very rarely burns, always tans' },
  { level: 6, label: 'Type VI', description: 'Dark · Never burns, always tans' },
]

interface FormState {
  fullName: string
  dateOfBirth: string
  phone: string
  skinType: SkinType | ''
  fitzpatrickScale: number | ''
  primaryConcern: string
  concernDuration: string
  currentSkincareRoutine: string
  currentMedications: string
  allergies: string
  previousTreatments: string
  gpName: string
  gpAddress: string
  companionEmail: string
  consentToShareHistory: boolean
  consentedToTerms: boolean
}

const EMPTY: FormState = {
  fullName: '',
  dateOfBirth: '',
  phone: '',
  skinType: '',
  fitzpatrickScale: '',
  primaryConcern: '',
  concernDuration: '',
  currentSkincareRoutine: '',
  currentMedications: '',
  allergies: '',
  previousTreatments: '',
  gpName: '',
  gpAddress: '',
  companionEmail: '',
  consentToShareHistory: false,
  consentedToTerms: false,
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className ?? 'w-4 h-4'}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

const DEMO_FORM: FormState = {
  fullName: 'Jessica Thompson',
  dateOfBirth: '1990-04-15',
  phone: '+44 7700 900123',
  skinType: 'combination',
  fitzpatrickScale: 2,
  primaryConcern: 'Pigmentation and uneven skin tone',
  concernDuration: '2 years',
  currentSkincareRoutine: 'Morning: gentle cleanser, vitamin C serum, SPF 50+\nEvening: retinol 0.5%, niacinamide, moisturiser',
  currentMedications: 'None',
  allergies: 'Fragrance, lanolin',
  previousTreatments: 'Chemical peels (x3), one round of IPL in 2022',
  gpName: 'Dr. Sarah Chen',
  gpAddress: 'Marylebone Health Centre, 60 New Cavendish St, London W1G 8TT',
  companionEmail: '',
  consentToShareHistory: false,
  consentedToTerms: false,
}

function IntakeFormContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('bookingId')
  const isDemo = !bookingId || bookingId === 'demo' || searchParams.get('demo') === 'true'

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(isDemo ? DEMO_FORM : EMPTY)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [clinicId, setClinicId] = useState<string>('')
  const [clinicName, setClinicName] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [uploadWarning, setUploadWarning] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [companionEmailSent, setCompanionEmailSent] = useState(false)
  const [error, setError] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [showCamera, setShowCamera] = useState(false)

  useEffect(() => {
    if (isDemo) {
      setClinicName('Harley Street Skin Clinic')
      setClinicId('demo-clinic')
      return
    }
    if (!bookingId) return
    const supabase = createBrowserClient()
    supabase
      .from('bookings')
      .select('clinic_id, patient_name, phone, clinics(name)')
      .eq('id', bookingId)
      .single()
      .then(({ data }) => {
        if (data) {
          setClinicId(data.clinic_id)
          setClinicName((data as { clinics?: { name?: string } }).clinics?.name ?? data.clinic_id)
          setForm((f) => ({
            ...f,
            fullName: data.patient_name ?? '',
            phone: data.phone ?? '',
          }))
        }
      })
  }, [bookingId, isDemo])

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const merged = [...photos, ...files].slice(0, 4)
    const added = merged.slice(photos.length)
    const newPreviews = [...photoPreviews, ...added.map((f) => URL.createObjectURL(f))].slice(0, 4)
    setPhotos(merged)
    setPhotoPreviews(newPreviews)
  }

  const handleCameraCapture = useCallback((file: File) => {
    if (photos.length >= 4) return
    const preview = URL.createObjectURL(file)
    setPhotos((prev) => [...prev, file].slice(0, 4))
    setPhotoPreviews((prev) => [...prev, preview].slice(0, 4))
    setShowCamera(false)
  }, [photos])

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index])
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadPhotos = useCallback(async (): Promise<string[]> => {
    if (!bookingId || !clinicId || photos.length === 0) return photoUrls
    setUploading(true)
    setUploadWarning('')
    const supabase = createBrowserClient()
    const urls: string[] = []
    const failed: string[] = []

    for (const file of photos) {
      const path = `${clinicId}/${bookingId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('intake-photos')
        .upload(path, file, { upsert: true })
      if (uploadError) {
        console.error('[intake] upload error', uploadError)
        failed.push(file.name)
        continue
      }
      const { data } = supabase.storage.from('intake-photos').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
    setUploading(false)
    if (failed.length > 0) {
      setUploadWarning(`${failed.length} photo${failed.length > 1 ? 's' : ''} couldn't be uploaded: ${failed.join(', ')}`)
    }
    setPhotoUrls(urls)
    return urls
  }, [bookingId, clinicId, photos, photoUrls])

  const handleNext = async () => {
    if (step === 4) {
      await uploadPhotos()
    }
    setStep((s) => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBack = () => {
    setStep((s) => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    if (!form.consentedToTerms) {
      setError('Please read and accept the consent statement to continue.')
      return
    }
    setSubmitting(true)
    setError('')

    if (isDemo) {
      await new Promise((r) => setTimeout(r, 800))
      setSubmitting(false)
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const supabase = createBrowserClient()
    const urls = photoUrls.length > 0 ? photoUrls : await uploadPhotos()

    const { error: insertError } = await supabase.from('intake_submissions').insert({
      booking_id: bookingId,
      clinic_id: clinicId,
      patient_name: form.fullName,
      date_of_birth: form.dateOfBirth,
      skin_type: form.skinType,
      fitzpatrick_scale: form.fitzpatrickScale || null,
      primary_concern: form.primaryConcern,
      concern_duration: form.concernDuration,
      previous_treatments: form.previousTreatments,
      current_skincare_routine: form.currentSkincareRoutine,
      current_medications: form.currentMedications,
      allergies: form.allergies,
      photo_urls: urls,
      gp_name: form.gpName,
      gp_address: form.gpAddress,
      passport_email: form.companionEmail || null,
      consented_at: new Date().toISOString(),
    })

    if (insertError) {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    const bookingUpdates: Record<string, unknown> = { intake_complete: true }
    if (form.companionEmail && form.consentToShareHistory) {
      bookingUpdates.passport_linked = true
    }

    await supabase.from('bookings').update(bookingUpdates).eq('id', bookingId)

    if (form.companionEmail) {
      fetch('/api/send-companion-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.companionEmail, patientName: form.fullName }),
      })
        .then((r) => { if (r.ok) setCompanionEmailSent(true) })
        .catch(() => {})
    }

    setSubmitting(false)
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-hazel-off-white flex flex-col items-center justify-center px-6 text-center">
        <LeafIcon className="w-12 h-12 text-hazel-sage mb-6" />
        <h2 className="hazel-wordmark font-bold text-4xl text-hazel-green mb-3">All done — thank you</h2>
        {isDemo ? (
          <>
            <p className="text-hazel-muted max-w-sm mb-2">
              This was a demo submission — nothing was saved.
            </p>
            <p className="text-hazel-muted/70 text-sm max-w-sm mb-6">
              In a live flow, the patient receives this link via WhatsApp after their call with Hazel. Their completed intake appears instantly on the clinic dashboard.
            </p>
            <a href="/" className="text-sm text-hazel-green underline underline-offset-2">← Back to demo</a>
          </>
        ) : (
          <>
            <p className="text-hazel-muted max-w-sm mb-2">
              Your intake form has been received by <strong>{clinicName}</strong>.
            </p>
            <p className="text-hazel-muted/70 text-sm max-w-sm mb-3">
              Your clinician will review your skin history before your appointment. See you soon.
            </p>
            {companionEmailSent && form.companionEmail && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 max-w-sm">
                Companion invite sent to {form.companionEmail}
              </p>
            )}
          </>
        )}
      </div>
    )
  }

  const STEPS = [
    'Your details',
    'Your skin',
    'Skincare & health',
    'Photos',
    'GP details',
    'Consent',
  ]

  return (
    <div className="min-h-screen bg-hazel-off-white">
      <NavHeader subtitle={clinicName || undefined} />

      <div className="max-w-xl mx-auto px-5 py-10">
        {/* Demo banner */}
        {isDemo && (
          <div className="mb-6 rounded-xl bg-hazel-sage/10 border border-hazel-sage/20 px-4 py-3 flex items-center gap-2">
            <LeafIcon className="w-4 h-4 text-hazel-sage shrink-0" />
            <p className="text-xs text-hazel-sage/80">
              <strong className="text-hazel-sage">Demo preview</strong> — pre-filled with sample data. In a live flow, patients receive this link via WhatsApp after booking.
            </p>
          </div>
        )}
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-hazel-muted font-medium uppercase tracking-wider">
              Step {step} of {STEPS.length}
            </span>
            <span className="text-xs text-hazel-muted">{STEPS[step - 1]}</span>
          </div>
          <div className="h-1.5 rounded-full bg-hazel-cream overflow-hidden">
            <div
              className="h-full bg-hazel-green rounded-full transition-all duration-500"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="hazel-wordmark font-semibold text-3xl text-hazel-green">Your details</h2>
            <p className="text-hazel-muted text-sm">
              Help us personalise your visit.
            </p>
            <div>
              <label className="block text-sm font-medium text-hazel-green mb-1.5">
                Full name
              </label>
              <div className="relative">
                <input className="hazel-input pr-11" value={form.fullName} onChange={set('fullName')} placeholder="Jane Smith" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <SpeechInputButton onTranscript={(t) => setForm((f) => ({ ...f, fullName: t }))} />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-hazel-green mb-1.5">
                Date of birth
              </label>
              <input type="date" className="hazel-input" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-hazel-green mb-1.5">
                Phone number
              </label>
              <input className="hazel-input" value={form.phone} onChange={set('phone')} placeholder="+44 7700 900000" />
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="hazel-wordmark font-semibold text-3xl text-hazel-green mb-1">Your skin</h2>
              <p className="text-hazel-muted text-sm">Tell us about your skin type and primary concern.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-hazel-green mb-2">Skin type</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {SKIN_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, skinType: t }))}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                      form.skinType === t
                        ? 'bg-hazel-green text-hazel-cream border-hazel-green'
                        : 'border-hazel-cream bg-white text-hazel-muted hover:border-hazel-green/40'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-hazel-green mb-2">
                Fitzpatrick scale
              </label>
              <div className="space-y-2">
                {FITZPATRICK.map(({ level, label, description }) => (
                  <button
                    key={level}
                    onClick={() => setForm((f) => ({ ...f, fitzpatrickScale: level }))}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      form.fitzpatrickScale === level
                        ? 'border-hazel-green bg-hazel-green/5'
                        : 'border-hazel-cream bg-white hover:border-hazel-green/30'
                    }`}
                  >
                    <span className="font-medium text-sm text-hazel-green">{label}</span>
                    <span className="ml-2 text-xs text-hazel-muted">{description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-hazel-green mb-1.5">
                Primary skin concern
              </label>
              <div className="relative">
                <input
                  className="hazel-input pr-11"
                  value={form.primaryConcern}
                  onChange={set('primaryConcern')}
                  placeholder="e.g. acne, pigmentation, rosacea…"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <SpeechInputButton
                    onTranscript={(t) =>
                      setForm((f) => ({
                        ...f,
                        primaryConcern: f.primaryConcern ? `${f.primaryConcern} ${t}` : t,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-hazel-green mb-1.5">
                How long have you had this concern?
              </label>
              <div className="relative">
                <input
                  className="hazel-input pr-11"
                  value={form.concernDuration}
                  onChange={set('concernDuration')}
                  placeholder="e.g. 6 months, 2 years…"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <SpeechInputButton onTranscript={(t) => setForm((f) => ({ ...f, concernDuration: t }))} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="hazel-wordmark font-semibold text-3xl text-hazel-green mb-1">Skincare & health</h2>
              <p className="text-hazel-muted text-sm">This helps your clinician tailor your consultation.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-hazel-green mb-1.5">
                Current skincare routine & products
              </label>
              <div className="relative">
                <textarea
                  rows={4}
                  className="hazel-input resize-none pr-11"
                  value={form.currentSkincareRoutine}
                  onChange={set('currentSkincareRoutine')}
                  placeholder="Morning: cleanser, SPF 50+…&#10;Evening: retinol serum, moisturiser…"
                />
                <div className="absolute right-2 top-2.5">
                  <SpeechInputButton
                    onTranscript={(t) =>
                      setForm((f) => ({
                        ...f,
                        currentSkincareRoutine: f.currentSkincareRoutine
                          ? `${f.currentSkincareRoutine}\n${t}`
                          : t,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-hazel-green mb-1.5">
                Current medications
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  className="hazel-input resize-none pr-11"
                  value={form.currentMedications}
                  onChange={set('currentMedications')}
                  placeholder="Include any oral or topical medications"
                />
                <div className="absolute right-2 top-2.5">
                  <SpeechInputButton
                    onTranscript={(t) =>
                      setForm((f) => ({
                        ...f,
                        currentMedications: f.currentMedications
                          ? `${f.currentMedications}\n${t}`
                          : t,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-hazel-green mb-1.5">
                Known allergies
              </label>
              <div className="relative">
                <input
                  className="hazel-input pr-11"
                  value={form.allergies}
                  onChange={set('allergies')}
                  placeholder="e.g. fragrance, nickel, penicillin"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <SpeechInputButton
                    onTranscript={(t) =>
                      setForm((f) => ({
                        ...f,
                        allergies: f.allergies ? `${f.allergies}, ${t}` : t,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-hazel-green mb-1.5">
                Previous skin treatments
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  className="hazel-input resize-none pr-11"
                  value={form.previousTreatments}
                  onChange={set('previousTreatments')}
                  placeholder="e.g. chemical peels, laser, microneedling…"
                />
                <div className="absolute right-2 top-2.5">
                  <SpeechInputButton
                    onTranscript={(t) =>
                      setForm((f) => ({
                        ...f,
                        previousTreatments: f.previousTreatments
                          ? `${f.previousTreatments}\n${t}`
                          : t,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="hazel-wordmark font-semibold text-3xl text-hazel-green mb-1">Skin photos</h2>
              <p className="text-hazel-muted text-sm">
                Upload up to 4 photos of your skin concern in natural light. This helps your clinician assess your skin before the appointment.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={photos.length >= 4}
                className="border-2 border-dashed border-hazel-cream rounded-2xl p-6 text-center cursor-pointer hover:border-hazel-green/40 transition-colors bg-white flex flex-col items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-hazel-sage">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
                <p className="text-sm font-medium text-hazel-green">Upload photos</p>
                <p className="text-xs text-hazel-muted/60">From your device</p>
              </button>

              <button
                type="button"
                onClick={() => setShowCamera(true)}
                disabled={photos.length >= 4}
                className="border-2 border-dashed border-hazel-cream rounded-2xl p-6 text-center cursor-pointer hover:border-hazel-green/40 transition-colors bg-white flex flex-col items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-hazel-sage">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                <p className="text-sm font-medium text-hazel-green">Take a photo</p>
                <p className="text-xs text-hazel-muted/60">Use your camera</p>
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />

            {photos.length > 0 && (
              <p className="text-xs text-hazel-muted/60 text-center">
                {photos.length} of 4 photo{photos.length > 1 ? 's' : ''} added
              </p>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {photos.map((file, i) => (
                  <div key={i} className="relative">
                    <div className="rounded-xl overflow-hidden aspect-square bg-hazel-cream/30">
                      {photoPreviews[i] ? (
                        <img
                          src={photoPreviews[i]}
                          alt={`Skin photo ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xs text-hazel-muted truncate px-2">{file.name}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full border border-hazel-cream flex items-center justify-center text-hazel-muted hover:text-red-500 shadow-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length === 0 && (
              <p className="text-xs text-hazel-muted/60 text-center">
                Photos are optional — tap Continue to skip
              </p>
            )}

            {uploading && (
              <p className="text-sm text-hazel-muted animate-pulse">Uploading photos…</p>
            )}

            {uploadWarning && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                ⚠ {uploadWarning}
              </p>
            )}
          </div>
        )}

        {/* Step 5 */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="hazel-wordmark font-semibold text-3xl text-hazel-green mb-1">GP details</h2>
              <p className="text-hazel-muted text-sm">
                In case your clinician needs to liaise with your GP.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-hazel-green mb-1.5">
                GP name
              </label>
              <div className="relative">
                <input
                  className="hazel-input pr-11"
                  value={form.gpName}
                  onChange={set('gpName')}
                  placeholder="Dr. Sarah Johnson"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <SpeechInputButton onTranscript={(t) => setForm((f) => ({ ...f, gpName: t }))} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-hazel-green mb-1.5">
                Practice address
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  className="hazel-input resize-none pr-11"
                  value={form.gpAddress}
                  onChange={set('gpAddress')}
                  placeholder="The Surgery, 1 High Street, London, EC1A 1BB"
                />
                <div className="absolute right-2 top-2.5">
                  <SpeechInputButton onTranscript={(t) => setForm((f) => ({ ...f, gpAddress: t }))} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6 */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="hazel-wordmark font-semibold text-3xl text-hazel-green mb-1">Final step</h2>
              <p className="text-hazel-muted text-sm">Review and consent to complete your intake.</p>
            </div>

            {/* Passport section */}
            <div className="rounded-2xl border border-hazel-sage/30 bg-hazel-green/5 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <LeafIcon className="w-5 h-5 text-hazel-sage mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-medium text-hazel-green text-base mb-1">
                    Do you use the hazel companion app?
                  </h3>
                  <p className="text-sm text-hazel-muted">
                    If you track your skin in Hazel, your clinician can access your skin history,
                    progress photos, and Derm report automatically — no extra forms needed.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-hazel-green mb-1.5">
                  Your hazel companion email address
                </label>
                <input
                  type="email"
                  className="hazel-input"
                  value={form.companionEmail}
                  onChange={set('companionEmail')}
                  placeholder="you@email.com"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consentToShareHistory}
                  onChange={set('consentToShareHistory')}
                  className="mt-0.5 accent-hazel-green"
                />
                <span className="text-sm text-hazel-muted">
                  I consent to sharing my hazel skin history with my clinician for this appointment
                </span>
              </label>

              {!form.companionEmail && (
                <p className="text-xs text-hazel-muted/60">
                  Don&apos;t have hazel yet?{' '}
                  <a
                    href={process.env.NEXT_PUBLIC_SKIN_COACH_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 text-hazel-sage"
                  >
                    Start tracking your skin — it takes 2 minutes
                  </a>
                </p>
              )}
            </div>

            {/* Main consent */}
            <div className="rounded-2xl border border-hazel-cream bg-white p-5 space-y-4">
              <h3 className="font-medium text-hazel-green text-sm uppercase tracking-wider">
                Consent statement
              </h3>
              <p className="text-sm text-hazel-muted leading-relaxed">
                I consent to the collection and processing of my personal and medical information for
                the purposes of this appointment at {clinicName}. I understand that this information
                will be stored securely and used only to support my clinical care. I confirm that the
                information I have provided is accurate and complete.
              </p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consentedToTerms}
                  onChange={set('consentedToTerms')}
                  className="mt-0.5 accent-hazel-green"
                />
                <span className="text-sm text-hazel-green font-medium">
                  I have read and agree to the above consent statement
                </span>
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-hazel-cream">
          {step > 1 ? (
            <button onClick={handleBack} className="hazel-btn-secondary text-sm px-6 py-2.5">
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 6 ? (
            <button onClick={handleNext} disabled={uploading} className="hazel-btn-primary text-sm px-6 py-2.5 disabled:opacity-50">
              {uploading ? 'Uploading…' : 'Continue'}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.consentedToTerms}
              className="hazel-btn-primary text-sm px-6 py-2.5 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit intake'}
            </button>
          )}
        </div>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  )
}

export default function IntakePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-hazel-off-white flex items-center justify-center">
          <span className="text-hazel-muted text-sm">Loading…</span>
        </div>
      }
    >
      <IntakeFormContent />
    </Suspense>
  )
}
