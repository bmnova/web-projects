import { NextResponse } from 'next/server'

/** Maps thrown auth / usage errors from API route guards to JSON. */
export function authUsageErrorResponse(err: unknown): NextResponse {
  const e = err as { message?: string; status?: number; code?: string }
  const body: { error: string; code?: string } = {
    error: e.message ?? 'Unauthorized',
  }
  if (e.code) body.code = e.code
  return NextResponse.json(body, { status: e.status ?? 401 })
}
