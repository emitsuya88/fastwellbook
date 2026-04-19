// src/app/api/stripe/webhook/route.ts
// Merchant-of-record webhook handler.
//
// Flow:
//   1. Customer pays → checkout.session.completed fires
//   2. Mark booking confirmed, store payment_intent_id
//   3. charge.succeeded fires (payment actually cleared)
//   4. Transfer payout_pence to business Stripe Express account
//   5. Record transfer in payouts table, mark booking payout_transferred = true
//
// Refund flow:
//   charge.refunded → reverse transfer if already sent → mark booking refunded

import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent, transferPayoutToBusiness } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(body, sig)
  } catch (err) {
    console.error('Webhook sig failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {

    // ── Step 1: Checkout completed — session closed, payment authorised
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const { bookingId } = session.metadata ?? {}
      if (!bookingId) break

      await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', bookingId)
        .eq('status', 'pending') // guard against double-fire

      // TODO: send confirmation email to customer + business (Resend)
      break
    }

    // ── Step 2: Charge actually cleared — fire transfer to business
    case 'charge.succeeded': {
      const charge = event.data.object as Stripe.Charge
      const paymentIntentId = charge.payment_intent as string
      if (!paymentIntentId) break

      // Load booking
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, payout_pence, payout_transferred, business_id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single()

      if (!booking) {
        console.warn('charge.succeeded: no booking for PI', paymentIntentId)
        break
      }

      if (booking.payout_transferred) {
        console.log('Payout already transferred for booking', booking.id)
        break
      }

      // Load business Stripe account
      const { data: business } = await supabase
        .from('businesses')
        .select('stripe_account_id, stripe_onboarded')
        .eq('id', booking.business_id)
        .single()

      if (!business?.stripe_account_id || !business.stripe_onboarded) {
        // Business not yet connected — queue for manual payout
        console.warn('Business not Stripe-onboarded, queueing payout for booking', booking.id)
        // TODO: insert into a manual_payouts queue table
        break
      }

      // Fire transfer
      let transfer: Stripe.Transfer
      try {
        transfer = await transferPayoutToBusiness({
          businessStripeAccountId: business.stripe_account_id,
          amountPence: booking.payout_pence,
          bookingId: booking.id,
        })
      } catch (err) {
        console.error('Transfer failed for booking', booking.id, err)
        // Don't break — still mark confirmed, retry via cron
        break
      }

      // Record payout + mark transferred
      await Promise.all([
        supabase.from('payouts').insert({
          business_id: booking.business_id,
          booking_id: booking.id,
          stripe_transfer_id: transfer.id,
          amount_pence: booking.payout_pence,
        }),
        supabase
          .from('bookings')
          .update({
            payout_transferred: true,
            transferred_at: new Date().toISOString(),
          })
          .eq('id', booking.id),
      ])

      break
    }

    // ── Refund issued (from Stripe dashboard or API)
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const paymentIntentId = charge.payment_intent as string

      const { data: booking } = await supabase
        .from('bookings')
        .select('id, payout_transferred')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single()

      if (!booking) break

      // If payout was already sent, reverse the transfer
      if (booking.payout_transferred) {
        const { data: payout } = await supabase
          .from('payouts')
          .select('stripe_transfer_id, amount_pence')
          .eq('booking_id', booking.id)
          .single()

        if (payout) {
          try {
            const { stripe: stripeLib } = await import('@/lib/stripe')
            await stripeLib.transfers.createReversal(payout.stripe_transfer_id)
          } catch (err) {
            console.error('Transfer reversal failed:', err)
          }
        }
      }

      await supabase
        .from('bookings')
        .update({ status: 'refunded' })
        .eq('id', booking.id)

      break
    }

    // ── Payment failed
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('stripe_payment_intent_id', pi.id)
      break
    }

    // ── Business completed Stripe Express onboarding
    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      if (account.details_submitted && account.payouts_enabled) {
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

export const runtime = 'nodejs'
