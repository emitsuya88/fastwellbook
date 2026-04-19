// src/types/index.ts
// Core domain types — mirrors DB schema

export type BusinessCategory = 'salon_spa' | 'fitness_yoga'

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded'

export interface Business {
  id: string
  owner_id: string
  name: string
  slug: string
  category: BusinessCategory
  description: string | null
  email: string
  phone: string | null
  address: string | null
  stripe_account_id: string | null  // Business's Stripe Express account (receives transfers)
  stripe_onboarded: boolean
  active: boolean
  created_at: string
}

export interface Service {
  id: string
  business_id: string
  name: string
  description: string | null
  duration_mins: number
  price_pence: number  // always in pence (GBP) — this is what customer pays
  active: boolean
  created_at: string
}

export interface Availability {
  id: string
  business_id: string
  day_of_week: number  // 0=Sun, 6=Sat
  start_time: string   // "09:00"
  end_time: string     // "18:00"
}

export interface Customer {
  id: string
  email: string
  name: string | null
  phone: string | null
  created_at: string
}

export interface Booking {
  id: string
  business_id: string
  customer_id: string | null
  service_id: string
  starts_at: string
  ends_at: string
  // Pricing — all snapshotted at booking creation time
  total_pence: number           // what customer paid
  commission_bps: number        // basis points at time of booking (869 = 8.69%)
  commission_pence: number      // total_pence * commission_bps / 10000
  stripe_fee_pence: number      // estimated Stripe fee (1.5% + 20p)
  payout_pence: number          // total_pence - commission_pence - stripe_fee_pence
  // Stripe
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  // Transfer to business
  payout_transferred: boolean
  transferred_at: string | null
  // Guest fields (when customer_id is null)
  guest_email: string | null
  guest_name: string | null
  guest_phone: string | null
  status: BookingStatus
  notes: string | null
  created_at: string
}

export interface Payout {
  id: string
  business_id: string
  booking_id: string
  stripe_transfer_id: string
  amount_pence: number
  created_at: string
}

// Enriched types (with joins)
export interface BookingWithDetails extends Booking {
  service: Service
  business: Business
}

// ─── Commission helpers ───
// You are merchant of record. You charge customer full price on YOUR Stripe account.
// After charge succeeds, you transfer payout_pence to business's Stripe Express account.

export const COMMISSION_BPS = 869  // 8.69% expressed in basis points

/**
 * Calculate commission in pence.
 * commission = total * 869 / 10000
 */
export function calculateCommission(totalPence: number): number {
  return Math.round((totalPence * COMMISSION_BPS) / 10000)
}

/**
 * Estimate Stripe processing fee for a UK card charge.
 * Rate: 1.5% + 20p (Stripe UK standard)
 */
export function estimateStripeFee(totalPence: number): number {
  return Math.round(totalPence * 0.015) + 20
}

/**
 * Calculate net payout to business after commission and Stripe fee.
 */
export function calculatePayout(totalPence: number): {
  commission: number
  stripeFee: number
  payout: number
} {
  const commission = calculateCommission(totalPence)
  const stripeFee = estimateStripeFee(totalPence)
  const payout = totalPence - commission - stripeFee
  return { commission, stripeFee, payout }
}

export function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

// Stripe Connect
export interface StripeConnectStatus {
  connected: boolean
  onboarded: boolean
  accountId: string | null
}
