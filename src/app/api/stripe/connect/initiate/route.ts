// src/app/api/stripe/connect/initiate/route.ts
// POST — generates a Stripe Express onboarding link for an authenticated business owner.
// Business clicks "Connect Stripe" in dashboard → hits this route → redirect to Stripe.

import { NextRequest, NextResponse } from 'next/server'
import { createConnectAccountLink } from '@/lib/stripe'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  // 1. Verify auth
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // 2. Load business
  const admin = createAdminClient()
  const { data: business } = await admin
    .from('businesses')
    .select('id, stripe_account_id, stripe_onboarded')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  if (business.stripe_onboarded) {
    return NextResponse.json({ error: 'Already connected' }, { status: 409 })
  }

  // 3. Generate onboarding link
  // If they already have an account ID (started but didn't finish), generate a new link for same account
  try {
    let onboardingUrl: string

    if (business.stripe_account_id) {
      // Re-generate link for existing account
      const { stripe } = await import('@/lib/stripe')
      const link = await stripe.accountLinks.create({
        account: business.stripe_account_id,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/platform/connect-stripe?retry=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback?account=${business.stripe_account_id}&businessId=${business.id}`,
        type: 'account_onboarding',
      })
      onboardingUrl = link.url
    } else {
      // Create new Express account + link
      onboardingUrl = await createConnectAccountLink(business.id)
    }

    return NextResponse.json({ url: onboardingUrl })
  } catch (err) {
    console.error('Connect initiate error:', err)
    return NextResponse.json({ error: 'Failed to create onboarding link' }, { status: 500 })
  }
}
