// src/lib/stripe.ts
// Merchant-of-record model:
//   - Customer pays YOUR Stripe account (platform account)
//   - After charge.succeeded webhook fires, you transfer payout_pence
//     to the business's Stripe Express account via stripe.transfers.create()
//   - You keep commission_pence + (actual stripe fee absorbed in commission)
//
// This is different from Stripe Connect's application_fee_amount pattern.
// You control the charge. Business receives a Transfer, not a direct charge.

import Stripe from 'stripe'
import { calculateCommission, estimateStripeFee, calculatePayout } from '@/types'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

// ── Create Stripe Connect onboarding link for a business
// Business completes Express onboarding → gets a Stripe account to receive transfers
export async function createConnectAccountLink(businessId: string): Promise<string> {
  // 1. Create Express account if needed (idempotent — check DB first before calling)
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'GB',
    capabilities: {
      transfers: { requested: true },
    },
    settings: {
      payouts: {
        schedule: { interval: 'daily' },
      },
    },
    metadata: { businessId },
  })

  // 2. Generate onboarding link
  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/platform/connect-stripe?retry=true`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback?account=${account.id}&businessId=${businessId}`,
    type: 'account_onboarding',
  })

  return link.url
}

// ── Create Stripe Checkout Session
// Charged to YOUR platform Stripe account (no stripeAccount header).
// payout_pence will be transferred to business after webhook confirms payment.
export async function createCheckoutSession(params: {
  serviceId: string
  serviceName: string
  totalPence: number
  bookingId: string
  slug: string
  guestEmail?: string
}): Promise<{ session: Stripe.Checkout.Session; payoutPence: number }> {
  const { commission, stripeFee, payout } = calculatePayout(params.totalPence)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: params.guestEmail,
    line_items: [
      {
        price_data: {
          currency: 'gbp',
          unit_amount: params.totalPence,
          product_data: {
            name: params.serviceName,
            // Customers see clean service name — no mention of platform fee
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      bookingId: params.bookingId,
      serviceId: params.serviceId,
      // Store payout amount so webhook doesn't need to recalculate
      payoutPence: payout.toString(),
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/b/${params.slug}/confirm?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/b/${params.slug}/book?cancelled=true`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min expiry
  })
  // Note: NO stripeAccount option here — charged on YOUR account

  return { session, payoutPence: payout }
}

// ── Transfer net payout to business's Stripe Express account
// Called from webhook after charge.succeeded
// Uses stripe.transfers — funds move from your platform balance to their Express account
export async function transferPayoutToBusiness(params: {
  businessStripeAccountId: string
  amountPence: number
  bookingId: string
  currency?: string
}): Promise<Stripe.Transfer> {
  return stripe.transfers.create({
    amount: params.amountPence,
    currency: params.currency ?? 'gbp',
    destination: params.businessStripeAccountId,
    metadata: {
      bookingId: params.bookingId,
      type: 'booking_payout',
    },
  })
}

// ── Issue refund on a payment intent (platform account)
// When refunding: you refund customer in full, business payout is reversed
export async function refundPaymentIntent(
  paymentIntentId: string,
  amountPence?: number // partial refund if specified, full refund if omitted
): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amountPence ? { amount: amountPence } : {}),
  })
}

// ── Reverse a transfer to a business (used when refunding a booking)
export async function reverseTransfer(
  transferId: string,
  amountPence?: number
): Promise<Stripe.TransferReversal> {
  return stripe.transfers.createReversal(transferId, {
    ...(amountPence ? { amount: amountPence } : {}),
    metadata: { reason: 'booking_refund' },
  })
}

// ── Verify Stripe webhook signature
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}

// ── Check if a Stripe Express account has completed onboarding
export async function getAccountStatus(stripeAccountId: string): Promise<{
  detailsSubmitted: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
}> {
  const account = await stripe.accounts.retrieve(stripeAccountId)
  return {
    detailsSubmitted: account.details_submitted,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  }
}
