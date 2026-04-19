// src/app/api/stripe/connect/callback/route.ts
// Called after business completes Stripe Express onboarding

import { NextRequest, NextResponse } from 'next/server'
import { exchangeConnectCode } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/platform/connect-stripe?error=${error}`, req.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/platform/connect-stripe?error=missing_params', req.url)
    )
  }

  let businessId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
    businessId = decoded.businessId
  } catch {
    return NextResponse.redirect(
      new URL('/platform/connect-stripe?error=invalid_state', req.url)
    )
  }

  try {
    const stripeAccountId = await exchangeConnectCode(code)
    const supabase = createAdminClient()

    await supabase
      .from('businesses')
      .update({ stripe_account_id: stripeAccountId })
      .eq('id', businessId)

    return NextResponse.redirect(
      new URL('/platform/dashboard?connected=true', req.url)
    )
  } catch (err) {
    console.error('Stripe Connect exchange failed:', err)
    return NextResponse.redirect(
      new URL('/platform/connect-stripe?error=exchange_failed', req.url)
    )
  }
}
