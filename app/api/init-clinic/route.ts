import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Jina Reader converts any URL to clean markdown, bypasses WAFs, and handles JS-rendered sites
async function fetchViaJina(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'text',
      },
    })
    if (!res.ok) throw new Error(`Jina HTTP ${res.status}`)
    const text = await res.text()
    return text.slice(0, 15000)
  } finally {
    clearTimeout(id)
  }
}

// Strip markdown code fences and extract the first JSON object — Claude sometimes wraps output in ```json
function extractJson(text: string): string {
  const stripped = text
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
  const match = stripped.match(/\{[\s\S]*\}/)
  return match ? match[0] : stripped
}

export async function POST(request: NextRequest) {
  const { url } = await request.json()

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url required' }, { status: 400 })
  }

  let normalized = url.trim()
  if (!normalized.startsWith('http')) normalized = 'https://' + normalized
  try { new URL(normalized) } catch {
    return NextResponse.json({ error: 'Please enter a valid clinic website URL.' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 500 })
  }

  const parsedUrl = new URL(normalized)
  const isSubpage = parsedUrl.pathname !== '/' && parsedUrl.pathname !== ''
  const homepageUrl = isSubpage ? `${parsedUrl.origin}/` : null

  let pageContent = ''
  try {
    const fetchTasks: Promise<string>[] = [fetchViaJina(normalized)]
    if (homepageUrl) fetchTasks.push(fetchViaJina(homepageUrl))
    else fetchTasks.push(Promise.reject(new Error('homepage not needed')))

    const [pageResult, homepageResult] = await Promise.allSettled(fetchTasks)
    const contentParts: string[] = []

    if (pageResult.status === 'fulfilled') {
      contentParts.push(pageResult.value)
    } else {
      console.warn('[init-clinic] page fetch failed:', pageResult.reason?.message)
    }

    if (homepageResult.status === 'fulfilled') {
      contentParts.push(`--- Homepage (${homepageUrl}) ---\n${homepageResult.value}`)
      console.log('[init-clinic] combined subpage + homepage via Jina')
    }

    if (contentParts.length === 0) throw new Error('all fetches failed')

    pageContent = contentParts.join('\n\n').slice(0, 14000)
  } catch (err) {
    console.error('[init-clinic] fetch error', err)
    return NextResponse.json(
      { error: "We couldn't access that website. Please check the URL is correct and publicly accessible." },
      { status: 400 }
    )
  }

  if (!pageContent.trim()) {
    return NextResponse.json(
      { error: 'The page returned no readable content. Try the homepage URL directly.' },
      { status: 400 }
    )
  }

  console.log('[init-clinic] content length:', pageContent.length, 'url:', normalized)

  const extractRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: [
        'You extract structured clinic information from website content.',
        'You MUST respond with ONLY a raw JSON object — no markdown, no backticks, no explanation, no surrounding text.',
        'Start your response with { and end with }.',
      ].join(' '),
      messages: [
        {
          role: 'user',
          content: `Extract clinic information from the content below. Respond with ONLY this JSON object (no markdown, no backticks):
{"name":"","address":"","phone":"","hours":"","doctors":[],"treatments":[],"tagline":""}

Field rules:
- name: the clinic or brand name
- address: full address with postcode if available
- phone: main phone number
- hours: concise string e.g. "Mon–Fri 9am–6pm, Sat 10am–4pm"
- doctors: array of up to 8 named practitioners/doctors/clinicians found on the page
- treatments: array of up to 12 specific treatments (e.g. "Botox", "dermal fillers", "laser hair removal") — not vague categories
- tagline: one sentence that describes what the clinic does, from the site copy

Use "" or [] if information is not present. Do not invent information.

Content from ${normalized}:
${pageContent}`,
        },
        {
          role: 'assistant',
          content: '{',
        },
      ],
    }),
  })

  if (!extractRes.ok) {
    const errText = await extractRes.text()
    console.error('[init-clinic] Anthropic error', extractRes.status, errText)
    return NextResponse.json({ error: 'Failed to analyse the clinic website.' }, { status: 500 })
  }

  const extractData = await extractRes.json()
  const rawText = '{' + (extractData.content?.[0]?.text ?? '')
  console.log('[init-clinic] raw response:', rawText.slice(0, 300))

  try {
    const jsonStr = extractJson(rawText)
    const clinic = JSON.parse(jsonStr)
    if (!Array.isArray(clinic.doctors)) clinic.doctors = []
    if (!Array.isArray(clinic.treatments)) clinic.treatments = []
    if (!clinic.name?.trim()) {
      return NextResponse.json(
        { error: "We found the site but couldn't identify the clinic name. Try entering a more specific page (e.g. /about or /contact)." },
        { status: 400 }
      )
    }
    console.log('[init-clinic] ✓', clinic.name, '| doctors:', clinic.doctors.length, '| treatments:', clinic.treatments.length)

    // Deterministic ID from URL so repeat loads hit the same row
    const clinicId = 'custom-' + createHash('sha256').update(normalized).digest('hex').slice(0, 12)

    const supabase = createServerClient()
    await supabase.from('clinics').upsert(
      { id: clinicId, name: clinic.name, data: clinic },
      { onConflict: 'id' }
    )

    return NextResponse.json({ ok: true, clinic, clinicId })
  } catch (err) {
    console.error('[init-clinic] parse error:', err, 'raw:', rawText.slice(0, 400))
    return NextResponse.json({ error: 'Could not extract clinic information from the site. Try a different page URL.' }, { status: 500 })
  }
}
