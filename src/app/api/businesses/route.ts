// src/app/api/businesses/route.ts
// POST — called at end of onboarding wizard.
// Creates business + services + availability atomically.
// Returns { businessId, slug } — frontend redirects to dashboard.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'

const ServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  duration_mins: z.number().int().min(15).max(480),
  price_pence: z.number().int().min(100), // min £1
})

const AvailabilitySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
})

const CreateBusinessSchema = z.object({
  name: z.string().min(2).max(80),
  category: z.enum(['salon_spa', 'fitness_yoga']),
  description: z.string().max(500).optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().min(5),
  services: z.array(ServiceSchema).min(1).max(20),
  availability: z.array(AvailabilitySchema).min(1),
})

// Generate URL-safe slug from business name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // 2. Validate
  const body = await req.json()
  const parsed = CreateBusinessSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const data = parsed.data
  const admin = createAdminClient()

  // 3. Check user doesn't already have a business
  const { data: existing } = await admin
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Business already exists for this account' }, { status: 409 })
  }

  // 4. Generate unique slug
  let slug = generateSlug(data.name)
  const { data: slugCheck } = await admin
    .from('businesses')
    .select('slug')
    .eq('slug', slug)
    .single()

  if (slugCheck) {
    // Append random suffix to ensure uniqueness
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  }

  // 5. Insert business
  const { data: business, error: bizErr } = await admin
    .from('businesses')
    .insert({
      owner_id: user.id,
      name: data.name,
      slug,
      category: data.category,
      description: data.description ?? null,
      email: data.email,
      phone: data.phone ?? null,
      address: data.address,
    })
    .select()
    .single()

  if (bizErr || !business) {
    console.error('Business insert failed:', bizErr)
    return NextResponse.json({ error: 'Failed to create business' }, { status: 500 })
  }

  // 6. Insert services
  const { error: svcErr } = await admin
    .from('services')
    .insert(
      data.services.map(s => ({
        business_id: business.id,
        name: s.name,
        description: s.description ?? null,
        duration_mins: s.duration_mins,
        price_pence: s.price_pence,
        active: true,
      }))
    )

  if (svcErr) {
    await admin.from('businesses').delete().eq('id', business.id)
    return NextResponse.json({ error: 'Failed to create services' }, { status: 500 })
  }

  // 7. Insert availability
  const { error: availErr } = await admin
    .from('availability')
    .insert(
      data.availability.map(a => ({
        business_id: business.id,
        day_of_week: a.day_of_week,
        start_time: a.start_time,
        end_time: a.end_time,
      }))
    )

  if (availErr) {
    await admin.from('businesses').delete().eq('id', business.id)
    return NextResponse.json({ error: 'Failed to create availability' }, { status: 500 })
  }

  return NextResponse.json({
    businessId: business.id,
    slug: business.slug,
    bookingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/b/${business.slug}`,
  }, { status: 201 })
}
