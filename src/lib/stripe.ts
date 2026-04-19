// src/lib/stripe.ts

import Stripe from 'stripe'
import { COMMISSION_RATE } from '@/types'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

// ── Create Stripe Connect OAuth link for a business
export function getConnectOnboardingUrl(businessId: string): string {
  const state = Buffer.from(JSON.stringify({ businessId })).toString('base64')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.STRIPE_PLATFORM_ACCOUNT_ID!,
    scope: 'read_write',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`,
    state,
    'stripe_user[business_type]': 'individual',
  })
  return `https://connect.stripe.com/oauth/authorize?${params}`
}

// ── Exchange OAuth code for Stripe account ID
export async function exchangeConnectCode(code: string): Promise<string> {
  const response = await stripe.oauth.token({
    grant_type: 'authorization_code',
    code,
  })
  if (!response.stripe_user_id) throw new Error('No stripe_user_id in OAuth response')
  return response.stripe_user_id
}

// ── Create Stripe Checkout Session
// Commission deducted via application_fee_amount
export async function createCheckoutSession(params: {
  businessStripeAccountId: string
  serviceId: string
  serviceName: string
  totalPence: number
  bookingId: string
  slug: string
}): Promise<Stripe.Checkout.Session> {
  const commissionPence = Math.round(params.totalPence * COMMISSION_RATE)

  return stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'gbp',
          unit_amount: params.totalPence,
          product_data: {
            name: params.serviceName,
          },
        },
        quantity: 1,
      },
    ],
    // 8% goes to platform, rest to connected business
    payment_intent_data: {
      application_fee_amount: commissionPence,
      transfer_data: {
        destination: params.businessStripeAccountId,
      },
    },
    metadata: {
      bookingId: params.bookingId,
      serviceId: params.serviceId,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/b/${params.slug}/confirm?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/b/${params.slug}/book`,
  }, {
    // Charge on behalf of the connected account
    stripeAccount: params.businessStripeAccountId,
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
