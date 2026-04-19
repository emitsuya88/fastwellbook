// src/app/api/stripe/connect/callback/route.ts
// Called when business returns from Stripe Express onboarding.
// Stripe redirects here with ?account=acct_xxx&businessId=xxx
// We store the account ID + check onboarding status.

import { NextRequest, NextResponse } from 'next/server'
import { getAccountStatus } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const stripeAccountId = searchParams.get('account')
  const businessId = searchParams.get('businessId')

  if (!stripeAccountId || !businessId) {
    return NextResponse.redirect(
      new URL('/platform/connect-stripe?error=missing_params', req.url)
    )
  }

  try {
    const supabase = createAdminClient()

    // Store account ID (may already be stored from createConnectAccountLink)
    await supabase
      .from('businesses')
      .update({ stripe_account_id: stripeAccountId })
      .eq('id', businessId)

    // Check if onboarding complete
    const status = await getAccountStatus(stripeAccountId)

    if (status.detailsSubmitted && status.payoutsEnabled) {
      await supabase
        .from('businesses')
        .update({ stripe_onboarded: true })
        .eq('id', businessId)

      return NextResponse.redirect(
        new URL('/platform/dashboard?connected=true', req.url)
      )
    } else {
      // Onboarding started but not complete — send back to finish
      return NextResponse.redirect(
        new URL('/platform/connect-stripe?incomplete=true', req.url)
      )
    }
  } catch (err) {
    console.error('Connect callback error:', err)
    return NextResponse.redirect(
      new URL('/platform/connect-stripe?error=verification_failed', req.url)
    )
  }
}
