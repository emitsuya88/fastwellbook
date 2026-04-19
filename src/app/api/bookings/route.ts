// src/app/api/bookings/route.ts
// Creates a pending booking + Stripe Checkout Session charged to platform account.
// Payout to business fires from webhook after charge.succeeded.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase'
import { createCheckoutSession } from '@/lib/stripe'
import { isSlotAvailable } from '@/lib/availability'
import { calculateCommission, estimateStripeFee, COMMISSION_BPS } from '@/types'
import { addMinutes, parseISO } from 'date-fns'

const CreateBookingSchema = z.object({
  businessId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime(),
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

  // Business needs Stripe Connect to receive their payout.
  // But we can still take the booking — payout queued until they onboard.
  // If you want to block until connected, uncomment:
  // if (!business.stripe_onboarded) {
  //   return NextResponse.json({ error: 'Business not accepting online payments yet' }, { status: 422 })
  // }

  // 2. Check slot availability
  const startsAt = parseISO(data.startsAt)
  const endsAt = addMinutes(startsAt, service.duration_mins)

  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('business_id', data.businessId)

  const dayStart = new Date(startsAt)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('business_id', data.businessId)
    .gte('starts_at', dayStart.toISOString())
    .lt('starts_at', dayEnd.toISOString())

  const available = isSlotAvailable(
    { startsAt, durationMins: service.duration_mins },
    availability ?? [],
    existingBookings ?? []
  )

  if (!available) {
    return NextResponse.json({ error: 'Slot not available' }, { status: 409 })
  }

  // 3. Calculate pricing — snapshot at creation
  const totalPence = service.price_pence
  const commissionPence = calculateCommission(totalPence)
  const stripeFee = estimateStripeFee(totalPence)
  const payoutPence = totalPence - commissionPence - stripeFee

  // 4. Create pending booking
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .insert({
      business_id: data.businessId,
      service_id: data.serviceId,
      customer_id: data.customerId ?? null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      total_pence: totalPence,
      commission_bps: COMMISSION_BPS,
      commission_pence: commissionPence,
      stripe_fee_pence: stripeFee,
      payout_pence: payoutPence,
      guest_name: data.guestName ?? null,
      guest_email: data.guestEmail ?? null,
      guest_phone: data.guestPhone ?? null,
      notes: data.notes ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (bookingErr || !booking) {
    console.error('Booking insert failed:', bookingErr)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  // 5. Create Stripe Checkout on PLATFORM account (no stripeAccount option)
  try {
    const { session } = await createCheckoutSession({
      serviceId: data.serviceId,
      serviceName: service.name,
      totalPence,
      bookingId: booking.id,
      slug: business.slug,
      guestEmail: data.guestEmail,
    })

    await supabase
      .from('bookings')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', booking.id)

    return NextResponse.json({
      checkoutUrl: session.url,
      bookingId: booking.id,
      pricing: {
        total: totalPence,
        commission: commissionPence,
        stripeFee,
        businessPayout: payoutPence,
      },
    })
  } catch (err) {
    // Roll back pending booking if Stripe session fails
    await supabase.from('bookings').delete().eq('id', booking.id)
    console.error('Stripe session creation failed:', err)
    return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 })
  }
}
