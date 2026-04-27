import { NextResponse } from 'next/server'

export async function GET() {
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID
  const privateKey = process.env.VAPI_PRIVATE_KEY
  if (!assistantId || !privateKey) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }
  try {
    const res = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      headers: { Authorization: `Bearer ${privateKey}` },
    })
    if (!res.ok) return NextResponse.json({ error: 'Vapi error' }, { status: 502 })
    const data = await res.json()
    return NextResponse.json({ model: data.model ?? null })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
