// src/app/api/bookings/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase'
import { createCheckoutSession } from '@/lib/stripe'
import { isSlotAvailable } from '@/lib/availability'
import { calculateCommission } from '@/types'
import { addMinutes, parseISO } from 'date-fns'

const CreateBookingSchema = z.object({
  businessId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime(),
  // Guest fields — one of these required
  guestName: z.string().min(1).optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),
  customerId: z.string().uuid().optional(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = CreateBookingSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  const supabase = createAdminClient()

  // 1. Load service + business
  const { data: service, error: serviceErr } = await supabase
    .from('services')
    .select('*, businesses(*)')
    .eq('id', data.serviceId)
    .eq('business_id', data.businessId)
    .eq('active', true)
    .single()

  if (serviceErr || !service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  const business = service.businesses
  if (!business.stripe_account_id || !business.stripe_onboarded) {
    return NextResponse.json({ error: 'Business not ready to accept payments' }, { status: 422 })
  }

  // 2. Check availability
  const startsAt = parseISO(data.startsAt)
  const endsAt = addMinutes(startsAt, service.duration_mins)

  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('business_id', data.businessId)

  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('business_id', data.businessId)
    .gte('starts_at', new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate()).toISOString())
    .lt('starts_at', new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate() + 1).toISOString())

  const available = isSlotAvailable(
    { startsAt, durationMins: service.duration_mins },
    availability ?? [],
    existingBookings ?? []
  )

  if (!available) {
    return NextResponse.json({ error: 'Slot not available' }, { status: 409 })
  }

  // 3. Create pending booking
  const totalPence = service.price_pence
  const commissionPence = calculateCommission(totalPence)

  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .insert({
      business_id: data.businessId,
      service_id: data.serviceId,
      customer_id: data.customerId ?? null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      total_pence: totalPence,
      commission_pence: commissionPence,
      guest_name: data.guestName ?? null,
      guest_email: data.guestEmail ?? null,
      guest_phone: data.guestPhone ?? null,
      notes: data.notes ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (bookingErr || !booking) {
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  // 4. Create Stripe Checkout Session
  try {
    const session = await createCheckoutSession({
      businessStripeAccountId: business.stripe_account_id,
      serviceId: data.serviceId,
      serviceName: service.name,
      totalPence,
      bookingId: booking.id,
      slug: business.slug,
    })

    // Store session ID on booking
    await supabase
      .from('bookings')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', booking.id)

    return NextResponse.json({ checkoutUrl: session.url, bookingId: booking.id })
  } catch (err) {
    // Roll back booking if Stripe fails
    await supabase.from('bookings').delete().eq('id', booking.id)
    console.error('Stripe checkout creation failed:', err)
    return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 })
  }
}
