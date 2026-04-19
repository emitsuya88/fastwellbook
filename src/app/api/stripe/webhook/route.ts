// src/app/api/stripe/webhook/route.ts
// Handles: checkout.session.completed, payment_intent.payment_failed, charge.refunded

import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(body, sig)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const bookingId = session.metadata?.bookingId

      if (!bookingId) break

      await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', bookingId)

      // TODO: send confirmation emails (Resend / SendGrid)
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      await supabase
        .from('bookings')
        .update({ status: 'refunded' })
        .eq('stripe_payment_intent_id', charge.payment_intent as string)
      break
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('stripe_payment_intent_id', pi.id)
      break
    }

    // Stripe Connect account updated — check if onboarding complete
    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      if (account.details_submitted) {
        await supabase
          .from('businesses')
          .update({ stripe_onboarded: true })
          .eq('stripe_account_id', account.id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}

// Stripe requires raw body — disable Next.js body parsing
export const runtime = 'nodejs'
