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
  stripe_account_id: string | null
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
  price_pence: number  // always in pence (GBP)
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
  total_pence: number
  commission_pence: number
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  guest_email: string | null
  guest_name: string | null
  guest_phone: string | null
  status: BookingStatus
  notes: string | null
  created_at: string
}

// Enriched types (with joins)
export interface BookingWithDetails extends Booking {
  service: Service
  business: Business
}

// Commission helpers
export const COMMISSION_RATE = 0.08  // 8%

export function calculateCommission(totalPence: number): number {
  return Math.round(totalPence * COMMISSION_RATE)
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
